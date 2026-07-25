import connectDB from "@/lib/db";
import { SaleModel } from "@/models/sale.model";
import { ProductModel } from "@/models/product.model";
import { CustomerModel } from "@/models/customer.model";
import mongoose, { Types } from "mongoose";
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

/**
 * Create a new sale invoice.
 *
 * Transaction steps:
 * 1. Validate stock availability for all line items (pre-transaction check)
 * 2. Generate atomic invoice number
 * 3. Save Sale document
 * 4. Decrement inventory + write stock movement records per line item
 * 5. Create Customer Ledger entry (debit = customer owes us grandTotal)
 * 6. Create Cash Ledger entry (credit = cash/bank came in for paidAmount)
 * 7. Commit
 *
 * PDF generation and WhatsApp send happen AFTER commit (fire-and-forget).
 */
export async function createSale(input: SaleCreateInput) {
  await connectDB();

  // ── Pre-transaction: load product data and validate stock ────────────────

  const itemsToValidate = input.items.map((i) => ({
    productId: i.productId,
    variantSku: i.variantSku,
    qty: i.qty,
  }));

  await validateStockAvailability(itemsToValidate);

  // Verify customer exists
  const customer = await CustomerModel.findById(input.customerId);
  if (!customer || !customer.isActive) {
    businessError("Customer not found or inactive");
  }

  // Load product data for snapshotting names and cost prices
  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const products = await ProductModel.find({ _id: { $in: productIds } });
  const productMap = new Map(
    products.map((p) => [p._id.toString(), p])
  );

  // ── Compute totals ────────────────────────────────────────────────────────

  const saleItems = input.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) businessError(`Product ${item.productId} not found`);

    const variant = product!.variants.find((v: any) => v.sku === item.variantSku);
    if (!variant) businessError(`Variant ${item.variantSku} not found`);

    const unitPricePaisa = toPaisa(roundCurrency(item.unitPrice));
    const discountPaisa = toPaisa(roundCurrency(item.discount));
    const lineTotalPaisa = (unitPricePaisa - discountPaisa) * item.qty;

    return {
      productId: new Types.ObjectId(item.productId),
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

  const subtotalPaisa = saleItems.reduce((sum, i) => sum + i.lineTotal, 0);
  const discountPaisa = toPaisa(roundCurrency(input.discount));
  const taxPaisa = toPaisa(roundCurrency(input.tax));
  const grandTotalPaisa = subtotalPaisa - discountPaisa + taxPaisa;
  const paidPaisa = toPaisa(roundCurrency(input.paidAmount));
  const remainingPaisa = Math.max(0, grandTotalPaisa - paidPaisa);
  const status = deriveStatus(paidPaisa, grandTotalPaisa);

  // ── Transaction ──────────────────────────────────────────────────────────

  const session = await mongoose.startSession();
  let savedSale;

  try {
    session.startTransaction();

    // 2. Generate atomic invoice number (inside transaction for rollback safety)
    const invoiceNumber = await generateInvoiceNumber(session);

    // 3. Save Sale
    const [sale] = await SaleModel.create(
      [
        {
          invoiceNumber,
          customerId: new Types.ObjectId(input.customerId),
          items: saleItems,
          subtotal: subtotalPaisa,
          discount: discountPaisa,
          tax: taxPaisa,
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

    savedSale = sale;

    // 4. Decrement inventory + write stock movement per line item
    for (const item of saleItems) {
      await adjustStock({
        productId: item.productId,
        variantSku: item.variantSku,
        delta: -item.qty, // negative = stock removed
        type: "sale",
        referenceId: sale._id,
        session,
      });
    }

    // 5. Customer Ledger: debit the full grandTotal (customer owes us this amount)
    await createLedgerEntry({
      date: new Date(),
      referenceType: "sale",
      referenceId: sale._id,
      debit: grandTotalPaisa,
      credit: 0,
      party: new Types.ObjectId(input.customerId),
      partyType: "customer",
      notes: `Invoice ${invoiceNumber}`,
      session,
    });

    // Credit back the paid portion on customer ledger (they paid immediately)
    if (paidPaisa > 0) {
      await createLedgerEntry({
        date: new Date(),
        referenceType: "payment",
        referenceId: sale._id,
        debit: 0,
        credit: paidPaisa,
        party: new Types.ObjectId(input.customerId),
        partyType: "customer",
        notes: `Payment on ${invoiceNumber}`,
        session,
      });
    }

    // 6. Cash/Bank Ledger: credit the paid portion (money came in)
    if (paidPaisa > 0) {
      await createLedgerEntry({
        date: new Date(),
        referenceType: "sale",
        referenceId: sale._id,
        debit: 0,
        credit: paidPaisa,
        partyType: "cash",
        notes: `${input.paymentMethod === "bank" ? "Bank" : "Cash"} receipt — ${invoiceNumber}`,
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

  // 7. PDF generation (after commit — not part of transaction)
  // PDF generation is handled separately by the API route after this returns

  return savedSale;
}

/**
 * Record an additional payment against an existing invoice.
 * Updates paidAmount, remainingAmount, status, and creates ledger entries.
 */
export async function recordSalePayment(
  saleId: string,
  input: SalePaymentInput
) {
  await connectDB();

  const sale = await SaleModel.findById(saleId);
  if (!sale) businessError("Sale not found");

  const paymentPaisa = toPaisa(roundCurrency(input.amount));
  const newPaidPaisa = sale!.paidAmount + paymentPaisa;

  if (newPaidPaisa > sale!.grandTotal) {
    businessError("Payment exceeds remaining balance");
  }

  const newRemainingPaisa = sale!.grandTotal - newPaidPaisa;
  const newStatus = deriveStatus(newPaidPaisa, sale!.grandTotal);

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    await SaleModel.updateOne(
      { _id: saleId },
      {
        $set: {
          paidAmount: newPaidPaisa,
          remainingAmount: newRemainingPaisa,
          status: newStatus,
        },
      },
      { session }
    );

    // Customer ledger: credit (they paid)
    await createLedgerEntry({
      date: new Date(),
      referenceType: "payment",
      referenceId: new Types.ObjectId(saleId),
      debit: 0,
      credit: paymentPaisa,
      party: sale!.customerId,
      partyType: "customer",
      notes: `Payment on ${sale!.invoiceNumber}`,
      session,
    });

    // Cash/Bank ledger: credit (money came in)
    await createLedgerEntry({
      date: new Date(),
      referenceType: "payment",
      referenceId: new Types.ObjectId(saleId),
      debit: 0,
      credit: paymentPaisa,
      partyType: "cash",
      notes: `Payment receipt — ${sale!.invoiceNumber}`,
      session,
    });

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }

  return SaleModel.findById(saleId).lean();
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
  await connectDB();

  const {
    page = 1,
    limit = 20,
    search,
    status,
    customerId,
    dateFrom,
    dateTo,
  } = params;

  const query: Record<string, unknown> = {};

  if (search) query.invoiceNumber = { $regex: search, $options: "i" };
  if (status) query.status = status;
  if (customerId) query.customerId = new Types.ObjectId(customerId);
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) (query.createdAt as Record<string, unknown>).$gte = dateFrom;
    if (dateTo) (query.createdAt as Record<string, unknown>).$lte = dateTo;
  }

  const [sales, total] = await Promise.all([
    SaleModel.find(query)
      .populate("customerId", "name phone")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    SaleModel.countDocuments(query),
  ]);

  return { sales, total, page, limit };
}

/** Get a single sale by ID with populated customer */
export async function getSaleById(id: string) {
  await connectDB();
  return SaleModel.findById(id).populate("customerId").lean();
}
