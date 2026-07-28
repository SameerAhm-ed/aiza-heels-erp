import { db } from "@/lib/db";
import {
  sales,
  saleItems as saleItemsTable,
  products,
  productVariants,
  customers,
} from "@/lib/schema";
import { and, desc, eq, gte, like, lte, sql, SQL } from "drizzle-orm";
import { toPaisa, roundCurrency } from "@/lib/currency";
import { businessError } from "@/lib/error-handler";
import { SaleCreateInput, SalePaymentInput } from "@/utils/zod-schemas";
import { generateInvoiceNumber } from "./invoice-number.service";
import { createLedgerEntry } from "./ledger.service";
import { adjustStock, validateStockAvailability } from "./stock.service";

/** Status derivation from paid vs grand total amounts */
function deriveStatus(paidPaisa: number, grandTotalPaisa: number) {
  if (paidPaisa <= 0) return "unpaid";
  if (paidPaisa >= grandTotalPaisa) return "paid";
  return "partial";
}

function withId<T extends { id: number }>(row: T) {
  return { ...row, _id: String(row.id) };
}

async function attachCustomer(sale: typeof sales.$inferSelect) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, sale.customerId));
  return {
    ...withId(sale),
    customerId: customer ? withId(customer) : null,
  };
}

/**
 * Create a new sale invoice.
 *
 * Transaction steps:
 * 1. Validate stock availability for all line items (pre-transaction check)
 * 2. Generate atomic invoice number
 * 3. Save Sale row
 * 4. Insert sale line items
 * 5. Decrement inventory + write stock movement records per line item
 * 6. Create Customer Ledger entry (debit = customer owes us grandTotal)
 * 7. Create Cash Ledger entry (credit = cash/bank came in for paidAmount)
 * 8. Commit
 *
 * PDF generation and WhatsApp send happen AFTER commit (fire-and-forget), handled by the API route.
 */
export async function createSale(input: SaleCreateInput) {
  // ── Pre-transaction: load product data and validate stock ────────────────

  const itemsToValidate = input.items.map((i) => ({
    productId: i.productId,
    variantSku: i.variantSku,
    qty: i.qty,
  }));

  await validateStockAvailability(itemsToValidate);

  // Verify customer exists
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, Number(input.customerId)));
  if (!customer || !customer.isActive) {
    businessError("Customer not found or inactive");
  }

  // Load product + variant data for snapshotting names and cost prices
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

  // ── Compute totals ────────────────────────────────────────────────────────

  const saleItemsData = input.items.map((item) => {
    const productId = Number(item.productId);
    const product = productMap.get(productId);
    if (!product) businessError(`Product ${item.productId} not found`);

    const variant = variantMap.get(item.variantSku);
    if (!variant || variant.productId !== productId)
      businessError(`Variant ${item.variantSku} not found`);

    const unitPricePaisa = toPaisa(roundCurrency(item.unitPrice));
    const discountPaisa = toPaisa(roundCurrency(item.discount));
    const lineTotalPaisa = (unitPricePaisa - discountPaisa) * item.qty;

    return {
      productId,
      productName: product!.name,
      variantSku: item.variantSku,
      size: variant!.size,
      color: variant!.color,
      qty: item.qty,
      unitPrice: unitPricePaisa,
      discount: discountPaisa,
      costPrice: variant!.purchasePrice, // COGS snapshot
      lineTotal: lineTotalPaisa,
    };
  });

  const subtotalPaisa = saleItemsData.reduce((sum, i) => sum + i.lineTotal, 0);
  const discountPaisa = toPaisa(roundCurrency(input.discount));
  const taxPaisa = toPaisa(roundCurrency(input.tax));
  const grandTotalPaisa = subtotalPaisa - discountPaisa + taxPaisa;
  const paidPaisa = toPaisa(roundCurrency(input.paidAmount));
  const remainingPaisa = Math.max(0, grandTotalPaisa - paidPaisa);
  const status = deriveStatus(paidPaisa, grandTotalPaisa);

  // ── Transaction ──────────────────────────────────────────────────────────

  const savedSaleId = await db.transaction(async (tx) => {
    // 2. Generate atomic invoice number (inside transaction for rollback safety)
    const invoiceNumber = await generateInvoiceNumber(tx);

    // 3. Save Sale
    const [sale] = await tx
      .insert(sales)
      .values({
        invoiceNumber,
        customerId: Number(input.customerId),
        subtotal: subtotalPaisa,
        discount: discountPaisa,
        tax: taxPaisa,
        grandTotal: grandTotalPaisa,
        paidAmount: paidPaisa,
        remainingAmount: remainingPaisa,
        paymentMethod: input.paymentMethod,
        status,
        notes: input.notes,
      })
      .returning();

    // 4. Insert sale line items
    await tx.insert(saleItemsTable).values(
      saleItemsData.map((item) => ({
        saleId: sale.id,
        productId: item.productId,
        productName: item.productName,
        variantSku: item.variantSku,
        size: item.size,
        color: item.color,
        qty: item.qty,
        unitPrice: item.unitPrice,
        discount: item.discount,
        costPrice: item.costPrice,
        lineTotal: item.lineTotal,
      }))
    );

    // 5. Decrement inventory + write stock movement per line item
    for (const item of saleItemsData) {
      await adjustStock({
        productId: item.productId,
        variantSku: item.variantSku,
        delta: -item.qty, // negative = stock removed
        type: "sale",
        referenceId: sale.id,
        tx,
      });
    }

    // 6. Customer Ledger: debit the full grandTotal (customer owes us this amount)
    await createLedgerEntry({
      date: new Date(),
      referenceType: "sale",
      referenceId: sale.id,
      debit: grandTotalPaisa,
      credit: 0,
      party: Number(input.customerId),
      partyType: "customer",
      notes: `Invoice ${invoiceNumber}`,
      tx,
    });

    // Credit back the paid portion on customer ledger (they paid immediately)
    if (paidPaisa > 0) {
      await createLedgerEntry({
        date: new Date(),
        referenceType: "payment",
        referenceId: sale.id,
        debit: 0,
        credit: paidPaisa,
        party: Number(input.customerId),
        partyType: "customer",
        notes: `Payment on ${invoiceNumber}`,
        tx,
      });
    }

    // 7. Cash/Bank Ledger: credit the paid portion (money came in)
    if (paidPaisa > 0) {
      await createLedgerEntry({
        date: new Date(),
        referenceType: "sale",
        referenceId: sale.id,
        debit: 0,
        credit: paidPaisa,
        party: null,
        partyType: "cash",
        notes: `${input.paymentMethod === "bank" ? "Bank" : "Cash"} receipt — ${invoiceNumber}`,
        tx,
      });
    }

    return sale.id;
  });

  // 8. PDF generation (after commit — not part of transaction)
  // PDF generation is handled separately by the API route after this returns

  // Non-null: the row was just inserted inside the transaction above.
  return (await getSaleById(String(savedSaleId)))!;
}

/**
 * Record an additional payment against an existing invoice.
 * Updates paidAmount, remainingAmount, status, and creates ledger entries.
 */
export async function recordSalePayment(
  saleId: string,
  input: SalePaymentInput
) {
  const id = Number(saleId);

  const [sale] = await db.select().from(sales).where(eq(sales.id, id));
  if (!sale) businessError("Sale not found");

  const paymentPaisa = toPaisa(roundCurrency(input.amount));
  const newPaidPaisa = sale!.paidAmount + paymentPaisa;

  if (newPaidPaisa > sale!.grandTotal) {
    businessError("Payment exceeds remaining balance");
  }

  const newRemainingPaisa = sale!.grandTotal - newPaidPaisa;
  const newStatus = deriveStatus(newPaidPaisa, sale!.grandTotal);

  await db.transaction(async (tx) => {
    await tx
      .update(sales)
      .set({
        paidAmount: newPaidPaisa,
        remainingAmount: newRemainingPaisa,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(sales.id, id));

    // Customer ledger: credit (they paid)
    await createLedgerEntry({
      date: new Date(),
      referenceType: "payment",
      referenceId: id,
      debit: 0,
      credit: paymentPaisa,
      party: sale!.customerId,
      partyType: "customer",
      notes: `Payment on ${sale!.invoiceNumber}`,
      tx,
    });

    // Cash/Bank ledger: credit (money came in)
    await createLedgerEntry({
      date: new Date(),
      referenceType: "payment",
      referenceId: id,
      debit: 0,
      credit: paymentPaisa,
      party: null,
      partyType: "cash",
      notes: `Payment receipt — ${sale!.invoiceNumber}`,
      tx,
    });
  });

  return (await getSaleById(saleId))!;
}

/** List sales with pagination, search, and status filtering */
export async function listSales(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  customerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const {
    page = 1,
    limit = 20,
    search,
    status,
    customerId,
    dateFrom,
    dateTo,
  } = params;

  const conditions: SQL[] = [];
  if (search) conditions.push(like(sales.invoiceNumber, `%${search}%`));
  if (status) conditions.push(eq(sales.status, status as "paid" | "partial" | "unpaid"));
  if (customerId) conditions.push(eq(sales.customerId, Number(customerId)));
  if (dateFrom) conditions.push(gte(sales.createdAt, dateFrom));
  if (dateTo) conditions.push(lte(sales.createdAt, dateTo));

  const where = conditions.length ? and(...conditions) : undefined;

  const [saleRows, countResult] = await Promise.all([
    db
      .select()
      .from(sales)
      .where(where)
      .orderBy(desc(sales.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ count: sql<number>`count(*)` }).from(sales).where(where),
  ]);

  const customerIds = [...new Set(saleRows.map((s) => s.customerId))];
  const customerRows = customerIds.length
    ? await db.select().from(customers).where(sql`${customers.id} IN ${customerIds}`)
    : [];
  const customerMap = new Map(customerRows.map((c) => [c.id, withId(c)]));

  const mapped = saleRows.map((sale) => ({
    ...withId(sale),
    customerId: customerMap.get(sale.customerId) ?? null,
  }));

  const total = Number(countResult[0]?.count ?? 0);

  return { sales: mapped, total, page, limit };
}

/** Get a single sale by ID with populated customer and line items */
export async function getSaleById(id: string) {
  const [sale] = await db.select().from(sales).where(eq(sales.id, Number(id)));
  if (!sale) return null;

  const items = await db
    .select()
    .from(saleItemsTable)
    .where(eq(saleItemsTable.saleId, sale.id));

  const saleWithCustomer = await attachCustomer(sale);

  return {
    ...saleWithCustomer,
    items: items.map(withId),
  };
}
