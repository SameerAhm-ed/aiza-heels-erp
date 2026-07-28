import { db } from "@/lib/db";
import {
  purchases,
  purchaseItems as purchaseItemsTable,
  products,
  productVariants,
  suppliers,
} from "@/lib/schema";
import { and, desc, eq, gte, lte, sql, SQL } from "drizzle-orm";
import { toPaisa, roundCurrency } from "@/lib/currency";
import { businessError } from "@/lib/error-handler";
import { PurchaseCreateInput } from "@/utils/zod-schemas";
import { createLedgerEntry } from "./ledger.service";
import { adjustStock } from "./stock.service";

function deriveStatus(paidPaisa: number, grandTotalPaisa: number) {
  if (paidPaisa <= 0) return "unpaid";
  if (paidPaisa >= grandTotalPaisa) return "paid";
  return "partial";
}

function withId<T extends { id: number }>(row: T) {
  return { ...row, _id: String(row.id) };
}

async function attachSupplier(purchase: typeof purchases.$inferSelect) {
  const [supplier] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, purchase.supplierId));
  return {
    ...withId(purchase),
    supplierId: supplier ? withId(supplier) : null,
  };
}

/**
 * Record a purchase from a supplier.
 *
 * Transaction steps:
 * 1. Validate supplier and products exist
 * 2. Save Purchase row + line items
 * 3. Increment inventory + write stock movement records per line item, update purchasePrice
 * 4. Create Supplier Ledger entry (credit = we owe them grandTotal)
 * 5. Create Cash/Bank Ledger entry (debit = cash went out for paidAmount)
 * 6. Commit
 */
export async function createPurchase(input: PurchaseCreateInput) {
  const [supplier] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, Number(input.supplierId)));
  if (!supplier || !supplier.isActive) businessError("Supplier not found or inactive");

  const productIds = [...new Set(input.items.map((i) => Number(i.productId)))];
  const variantSkus = [...new Set(input.items.map((i) => i.variantSku))];

  const productRows = await db
    .select()
    .from(products)
    .where(sql`${products.id} IN ${productIds}`);
  const productMap = new Map(productRows.map((p) => [p.id, p]));

  const variantRows = await db
    .select()
    .from(productVariants)
    .where(sql`${productVariants.sku} IN ${variantSkus}`);
  const variantMap = new Map(variantRows.map((v) => [v.sku, v]));

  const purchaseItemsData = input.items.map((item) => {
    const productId = Number(item.productId);
    const product = productMap.get(productId);
    if (!product) businessError(`Product ${item.productId} not found`);

    const variant = variantMap.get(item.variantSku);
    if (!variant || variant.productId !== productId)
      businessError(`Variant ${item.variantSku} not found`);

    const unitCostPaisa = toPaisa(roundCurrency(item.unitCost));
    const lineTotalPaisa = unitCostPaisa * item.qty;

    return {
      productId,
      productName: product!.name,
      variantSku: item.variantSku,
      qty: item.qty,
      unitCost: unitCostPaisa,
      lineTotal: lineTotalPaisa,
    };
  });

  const grandTotalPaisa = purchaseItemsData.reduce((s, i) => s + i.lineTotal, 0);
  const paidPaisa = toPaisa(roundCurrency(input.paidAmount));
  const remainingPaisa = Math.max(0, grandTotalPaisa - paidPaisa);
  const status = deriveStatus(paidPaisa, grandTotalPaisa);

  const savedPurchaseId = await db.transaction(async (tx) => {
    const [purchase] = await tx
      .insert(purchases)
      .values({
        supplierId: Number(input.supplierId),
        grandTotal: grandTotalPaisa,
        paidAmount: paidPaisa,
        remainingAmount: remainingPaisa,
        paymentMethod: input.paymentMethod,
        status,
        notes: input.notes,
      })
      .returning();

    await tx.insert(purchaseItemsTable).values(
      purchaseItemsData.map((item) => ({
        purchaseId: purchase.id,
        productId: item.productId,
        productName: item.productName,
        variantSku: item.variantSku,
        qty: item.qty,
        unitCost: item.unitCost,
        lineTotal: item.lineTotal,
      }))
    );

    // Increase inventory per line item
    for (const item of purchaseItemsData) {
      await adjustStock({
        productId: item.productId,
        variantSku: item.variantSku,
        delta: item.qty, // positive = stock added
        type: "purchase",
        referenceId: purchase.id,
        tx,
      });

      // Also update the purchasePrice on the variant to reflect new cost
      await tx
        .update(productVariants)
        .set({ purchasePrice: item.unitCost })
        .where(eq(productVariants.sku, item.variantSku));
    }

    // Supplier ledger: credit (we owe them)
    await createLedgerEntry({
      date: new Date(),
      referenceType: "purchase",
      referenceId: purchase.id,
      debit: 0,
      credit: grandTotalPaisa,
      party: Number(input.supplierId),
      partyType: "supplier",
      notes: `Purchase from ${supplier!.name}`,
      tx,
    });

    // Supplier ledger: debit the paid portion (we paid)
    if (paidPaisa > 0) {
      await createLedgerEntry({
        date: new Date(),
        referenceType: "payment",
        referenceId: purchase.id,
        debit: paidPaisa,
        credit: 0,
        party: Number(input.supplierId),
        partyType: "supplier",
        notes: `Payment to ${supplier!.name}`,
        tx,
      });

      // Cash ledger: debit (cash went out)
      await createLedgerEntry({
        date: new Date(),
        referenceType: "purchase",
        referenceId: purchase.id,
        debit: paidPaisa,
        credit: 0,
        party: null,
        partyType: "cash",
        notes: `${input.paymentMethod === "bank" ? "Bank" : "Cash"} payment — purchase`,
        tx,
      });
    }

    return purchase.id;
  });

  // Non-null: the row was just inserted inside the transaction above.
  return (await getPurchaseById(String(savedPurchaseId)))!;
}

export async function listPurchases(params: {
  page?: number;
  limit?: number;
  supplierId?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const { page = 1, limit = 20, supplierId, status, dateFrom, dateTo } = params;

  const conditions: SQL[] = [];
  if (supplierId) conditions.push(eq(purchases.supplierId, Number(supplierId)));
  if (status) conditions.push(eq(purchases.status, status as "paid" | "partial" | "unpaid"));
  if (dateFrom) conditions.push(gte(purchases.createdAt, dateFrom));
  if (dateTo) conditions.push(lte(purchases.createdAt, dateTo));

  const where = conditions.length ? and(...conditions) : undefined;

  const [purchaseRows, countResult] = await Promise.all([
    db
      .select()
      .from(purchases)
      .where(where)
      .orderBy(desc(purchases.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ count: sql<number>`count(*)` }).from(purchases).where(where),
  ]);

  const supplierIds = [...new Set(purchaseRows.map((p) => p.supplierId))];
  const supplierRows = supplierIds.length
    ? await db.select().from(suppliers).where(sql`${suppliers.id} IN ${supplierIds}`)
    : [];
  const supplierMap = new Map(supplierRows.map((s) => [s.id, withId(s)]));

  const mapped = purchaseRows.map((purchase) => ({
    ...withId(purchase),
    supplierId: supplierMap.get(purchase.supplierId) ?? null,
  }));

  const total = Number(countResult[0]?.count ?? 0);

  return { purchases: mapped, total, page, limit };
}

export async function getPurchaseById(id: string) {
  const [purchase] = await db
    .select()
    .from(purchases)
    .where(eq(purchases.id, Number(id)));
  if (!purchase) return null;

  const items = await db
    .select()
    .from(purchaseItemsTable)
    .where(eq(purchaseItemsTable.purchaseId, purchase.id));

  const purchaseWithSupplier = await attachSupplier(purchase);

  return {
    ...purchaseWithSupplier,
    items: items.map(withId),
  };
}
