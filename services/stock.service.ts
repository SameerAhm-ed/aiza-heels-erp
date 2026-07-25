import connectDB from "@/lib/db";
import { ProductModel } from "@/models/product.model";
import { StockMovementModel } from "@/models/stock-movement.model";
import { ClientSession, Types } from "mongoose";
import { StockMovementType } from "@/types";
import { businessError } from "@/lib/error-handler";

interface AdjustStockParams {
  productId: Types.ObjectId | string;
  variantSku: string;
  delta: number; // positive = add stock, negative = remove stock
  type: StockMovementType;
  referenceId?: Types.ObjectId | string;
  reason?: string;
  session: ClientSession;
}

/**
 * Adjust stock for a single product variant and write the audit movement record.
 * Throws a business error if the adjustment would result in negative stock (for sales).
 *
 * This MUST be called inside an active MongoDB transaction session.
 */
export async function adjustStock(params: AdjustStockParams): Promise<void> {
  await connectDB();

  const { productId, variantSku, delta, type, referenceId, reason, session } = params;

  // Load the product within the transaction to read current stock (session ensures isolation)
  const product = await ProductModel.findOne(
    { _id: productId, "variants.sku": variantSku },
    { "variants.$": 1 },
    { session }
  );

  if (!product || !product.variants?.[0]) {
    businessError(`Product variant ${variantSku} not found`);
  }

  const variant = product.variants[0];
  const newStock = variant.currentStock + delta;

  // Block negative stock — sale creation must pre-validate before calling this
  if (newStock < 0) {
    businessError(
      `Insufficient stock for ${variantSku}: available ${variant.currentStock}, requested ${Math.abs(delta)}`
    );
  }

  // Update the variant's stock counter
  await ProductModel.updateOne(
    { _id: productId, "variants.sku": variantSku },
    { $set: { "variants.$.currentStock": newStock } },
    { session }
  );

  // Write immutable stock movement audit record
  await StockMovementModel.create(
    [
      {
        productId,
        variantSku,
        type,
        delta,
        resultingBalance: newStock,
        referenceId: referenceId ?? null,
        reason: reason ?? null,
      },
    ],
    { session }
  );
}

/**
 * Validate that all line items have sufficient stock BEFORE starting a transaction.
 * Throws a business error describing which items are short.
 */
export async function validateStockAvailability(
  items: Array<{ productId: string; variantSku: string; qty: number }>
): Promise<void> {
  await connectDB();

  const errors: string[] = [];

  for (const item of items) {
    const product = await ProductModel.findOne(
      { _id: item.productId, "variants.sku": item.variantSku },
      { "variants.$": 1, name: 1 }
    );

    if (!product || !product.variants?.[0]) {
      errors.push(`Product variant ${item.variantSku} not found`);
      continue;
    }

    const variant = product.variants[0];
    if (variant.currentStock < item.qty) {
      errors.push(
        `${product.name} (${item.variantSku}): need ${item.qty}, have ${variant.currentStock}`
      );
    }
  }

  if (errors.length > 0) {
    businessError(`Insufficient stock:\n${errors.join("\n")}`);
  }
}
