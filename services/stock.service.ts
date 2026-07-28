import { db } from "@/lib/db";
import { products, productVariants, stockMovements } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { StockMovementType } from "@/types";
import { businessError } from "@/lib/error-handler";

/** Drizzle transaction type — same shape as `db` for query purposes. */
type DrizzleTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface AdjustStockParams {
  productId: number | string;
  variantSku: string;
  delta: number; // positive = add stock, negative = remove stock
  type: StockMovementType;
  referenceId?: number | string;
  reason?: string;
  tx: DrizzleTx;
}

/**
 * Adjust stock for a single product variant and write the audit movement record.
 * Throws a business error if the adjustment would result in negative stock (for sales).
 *
 * This MUST be called with the `tx` from an active `db.transaction()` block so it
 * participates in the caller's transaction.
 */
export async function adjustStock(params: AdjustStockParams): Promise<void> {
  const { productId, variantSku, delta, type, referenceId, reason, tx } = params;
  const productIdNum = Number(productId);

  const [variant] = await tx
    .select()
    .from(productVariants)
    .where(
      and(
        eq(productVariants.productId, productIdNum),
        eq(productVariants.sku, variantSku)
      )
    );

  if (!variant) {
    businessError(`Product variant ${variantSku} not found`);
  }

  const newStock = variant!.currentStock + delta;

  // Block negative stock — sale creation must pre-validate before calling this
  if (newStock < 0) {
    businessError(
      `Insufficient stock for ${variantSku}: available ${variant!.currentStock}, requested ${Math.abs(delta)}`
    );
  }

  // Update the variant's stock counter
  await tx
    .update(productVariants)
    .set({ currentStock: newStock })
    .where(
      and(
        eq(productVariants.productId, productIdNum),
        eq(productVariants.sku, variantSku)
      )
    );

  // Write immutable stock movement audit record
  await tx.insert(stockMovements).values({
    productId: productIdNum,
    variantSku,
    type,
    delta,
    resultingBalance: newStock,
    referenceId: referenceId !== undefined ? Number(referenceId) : null,
    reason: reason ?? null,
  });
}

/**
 * Validate that all line items have sufficient stock BEFORE starting a transaction.
 * Throws a business error describing which items are short.
 */
export async function validateStockAvailability(
  items: Array<{ productId: string; variantSku: string; qty: number }>
): Promise<void> {
  const errors: string[] = [];

  for (const item of items) {
    const productIdNum = Number(item.productId);
    const [row] = await db
      .select({
        currentStock: productVariants.currentStock,
        name: products.name,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(
        and(
          eq(productVariants.productId, productIdNum),
          eq(productVariants.sku, item.variantSku)
        )
      );

    if (!row) {
      errors.push(`Product variant ${item.variantSku} not found`);
      continue;
    }

    if (row.currentStock < item.qty) {
      errors.push(
        `${row.name} (${item.variantSku}): need ${item.qty}, have ${row.currentStock}`
      );
    }
  }

  if (errors.length > 0) {
    businessError(`Insufficient stock:\n${errors.join("\n")}`);
  }
}
