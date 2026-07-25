import connectDB from "@/lib/db";
import { PurchaseModel } from "@/models/purchase.model";
import { ProductModel } from "@/models/product.model";
import { SupplierModel } from "@/models/supplier.model";
import mongoose, { Types } from "mongoose";
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

/**
 * Record a purchase from a supplier.
 *
 * Transaction steps:
 * 1. Validate supplier and products exist
 * 2. Save Purchase document
 * 3. Increment inventory + write stock movement records per line item
 * 4. Create Supplier Ledger entry (credit = we owe them grandTotal)
 * 5. Create Cash/Bank Ledger entry (debit = cash went out for paidAmount)
 * 6. Commit
 */
export async function createPurchase(input: PurchaseCreateInput) {
  await connectDB();

  const supplier = await SupplierModel.findById(input.supplierId);
  if (!supplier || !supplier.isActive) businessError("Supplier not found or inactive");

  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const products = await ProductModel.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const purchaseItems = input.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) businessError(`Product ${item.productId} not found`);

    const variant = product!.variants.find((v: any) => v.sku === item.variantSku);
    if (!variant) businessError(`Variant ${item.variantSku} not found`);

    const unitCostPaisa = toPaisa(roundCurrency(item.unitCost));
    const lineTotalPaisa = unitCostPaisa * item.qty;

    return {
      productId: new Types.ObjectId(item.productId),
      productName: product!.name,
      variantSku: item.variantSku,
      qty: item.qty,
      unitCost: unitCostPaisa,
      lineTotal: lineTotalPaisa,
    };
  });

  const grandTotalPaisa = purchaseItems.reduce((s, i) => s + i.lineTotal, 0);
  const paidPaisa = toPaisa(roundCurrency(input.paidAmount));
  const remainingPaisa = Math.max(0, grandTotalPaisa - paidPaisa);
  const status = deriveStatus(paidPaisa, grandTotalPaisa);

  const session = await mongoose.startSession();
  let savedPurchase;

  try {
    session.startTransaction();

    const [purchase] = await PurchaseModel.create(
      [
        {
          supplierId: new Types.ObjectId(input.supplierId),
          items: purchaseItems,
          grandTotal: grandTotalPaisa,
          paidAmount: paidPaisa,
          remainingAmount: remainingPaisa,
          paymentMethod: input.paymentMethod,
          status,
          notes: input.notes,
        },
      ],
      { session }
    );

    savedPurchase = purchase;

    // Increase inventory per line item
    for (const item of purchaseItems) {
      await adjustStock({
        productId: item.productId,
        variantSku: item.variantSku,
        delta: item.qty, // positive = stock added
        type: "purchase",
        referenceId: purchase._id,
        session,
      });

      // Also update the purchasePrice on the variant to reflect new cost
      await ProductModel.updateOne(
        { _id: item.productId, "variants.sku": item.variantSku },
        { $set: { "variants.$.purchasePrice": item.unitCost } },
        { session }
      );
    }

    // Supplier ledger: credit (we owe them)
    await createLedgerEntry({
      date: new Date(),
      referenceType: "purchase",
      referenceId: purchase._id,
      debit: 0,
      credit: grandTotalPaisa,
      party: new Types.ObjectId(input.supplierId),
      partyType: "supplier",
      notes: `Purchase from ${supplier!.name}`,
      session,
    });

    // Supplier ledger: debit the paid portion (we paid)
    if (paidPaisa > 0) {
      await createLedgerEntry({
        date: new Date(),
        referenceType: "payment",
        referenceId: purchase._id,
        debit: paidPaisa,
        credit: 0,
        party: new Types.ObjectId(input.supplierId),
        partyType: "supplier",
        notes: `Payment to ${supplier!.name}`,
        session,
      });

      // Cash ledger: debit (cash went out)
      await createLedgerEntry({
        date: new Date(),
        referenceType: "purchase",
        referenceId: purchase._id,
        debit: paidPaisa,
        credit: 0,
        partyType: "cash",
        notes: `${input.paymentMethod === "bank" ? "Bank" : "Cash"} payment — purchase`,
        session,
      });
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }

  return savedPurchase;
}

export async function listPurchases(params: {
  page?: number;
  limit?: number;
  supplierId?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  await connectDB();
  const { page = 1, limit = 20, supplierId, status, dateFrom, dateTo } = params;
  const query: Record<string, unknown> = {};
  if (supplierId) query.supplierId = new Types.ObjectId(supplierId);
  if (status) query.status = status;
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) (query.createdAt as Record<string, unknown>).$gte = dateFrom;
    if (dateTo) (query.createdAt as Record<string, unknown>).$lte = dateTo;
  }
  const [purchases, total] = await Promise.all([
    PurchaseModel.find(query)
      .populate("supplierId", "name phone")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    PurchaseModel.countDocuments(query),
  ]);
  return { purchases, total, page, limit };
}

export async function getPurchaseById(id: string) {
  await connectDB();
  return PurchaseModel.findById(id).populate("supplierId").lean();
}
