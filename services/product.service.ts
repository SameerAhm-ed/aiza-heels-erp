import { db } from "@/lib/db";
import { products, productVariants, categories, stockMovements } from "@/lib/schema";
import { and, asc, count, desc, eq, like, or, sql } from "drizzle-orm";
import { toPaisa } from "@/lib/currency";
import { businessError } from "@/lib/error-handler";
import {
  ProductCreateInput,
  ProductUpdateInput,
  StockAdjustmentInput,
} from "@/utils/zod-schemas";
import { adjustStock } from "./stock.service";

function withId<T extends { id: number }>(row: T) {
  return { ...row, _id: String(row.id) };
}

async function getVariantsForProduct(productId: number) {
  const rows = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, productId));
  return rows.map(withId);
}

async function attachVariants<T extends { id: number }>(product: T) {
  const variants = await getVariantsForProduct(product.id);
  return { ...withId(product), variants };
}

export async function createProduct(input: ProductCreateInput) {
  return db.transaction(async (tx) => {
    const { variants, ...rest } = input;

    const [product] = await tx
      .insert(products)
      .values({
        ...rest,
        categoryId: Number(input.categoryId),
      })
      .returning();

    const insertedVariants = variants.length
      ? await tx
          .insert(productVariants)
          .values(
            variants.map((v) => ({
              ...v,
              productId: product.id,
              purchasePrice: toPaisa(v.purchasePrice),
              sellingPrice: toPaisa(v.sellingPrice),
            }))
          )
          .returning()
      : [];

    return { ...withId(product), variants: insertedVariants.map(withId) };
  });
}

export async function updateProduct(id: string, input: ProductUpdateInput) {
  const productId = Number(id);

  return db.transaction(async (tx) => {
    const { variants, ...rest } = input;
    const update: Record<string, unknown> = { ...rest };
    if (rest.categoryId !== undefined) {
      update.categoryId = Number(rest.categoryId);
    }
    update.updatedAt = new Date();

    const [product] = await tx
      .update(products)
      .set(update)
      .where(eq(products.id, productId))
      .returning();

    if (!product) businessError("Product not found");

    let resultVariants;
    if (variants) {
      // Whole-array replace semantics (matches prior embedded-array behavior)
      await tx.delete(productVariants).where(eq(productVariants.productId, productId));
      resultVariants = variants.length
        ? await tx
            .insert(productVariants)
            .values(
              variants.map((v) => ({
                ...v,
                productId,
                purchasePrice: toPaisa(v.purchasePrice ?? 0),
                sellingPrice: toPaisa(v.sellingPrice ?? 0),
              }))
            )
            .returning()
        : [];
    } else {
      resultVariants = await tx
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, productId));
    }

    return { ...withId(product!), variants: resultVariants.map(withId) };
  });
}

export async function softDeleteProduct(id: string) {
  const [product] = await db
    .update(products)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(products.id, Number(id)))
    .returning();
  return product ? attachVariants(product) : null;
}

export async function listProducts(params: {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  lowStock?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  includeInactive?: boolean;
}) {
  const {
    page = 1,
    limit = 20,
    search,
    categoryId,
    lowStock,
    sortBy = "createdAt",
    sortOrder = "desc",
    includeInactive = false,
  } = params;

  const conditions = [];
  if (!includeInactive) conditions.push(eq(products.isActive, true));
  if (categoryId) conditions.push(eq(products.categoryId, Number(categoryId)));
  if (search) {
    conditions.push(
      or(
        like(products.name, `%${search}%`),
        like(products.model, `%${search}%`),
        sql`exists (select 1 from ${productVariants} where ${productVariants.productId} = ${products.id} and ${productVariants.sku} like ${`%${search}%`})`
      )
    );
  }
  if (lowStock) {
    // Any variant at or below the product's minStockAlert threshold
    conditions.push(
      sql`exists (select 1 from ${productVariants} where ${productVariants.productId} = ${products.id} and ${productVariants.currentStock} <= ${products.minStockAlert})`
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const sortColumn =
    (products as unknown as Record<string, any>)[sortBy] ?? products.createdAt;
  const orderFn = sortOrder === "asc" ? asc : desc;

  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select({
        product: products,
        categoryId: categories.id,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(where)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ value: count() }).from(products).where(where),
  ]);

  const productsWithVariants = await Promise.all(
    rows.map(async (r) => {
      const variants = await getVariantsForProduct(r.product.id);
      return {
        ...withId(r.product),
        categoryId: {
          id: r.categoryId,
          _id: r.categoryId != null ? String(r.categoryId) : null,
          name: r.categoryName,
        },
        variants,
      };
    })
  );

  return { products: productsWithVariants, total, page, limit };
}

export async function getProductById(id: string) {
  const productId = Number(id);
  const [row] = await db
    .select({
      product: products,
      categoryId: categories.id,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, productId));

  if (!row) return null;

  const variants = await getVariantsForProduct(productId);

  return {
    ...withId(row.product),
    categoryId: {
      id: row.categoryId,
      _id: row.categoryId != null ? String(row.categoryId) : null,
      name: row.categoryName,
    },
    variants,
  };
}

/** Manual stock adjustment (damage, corrections, etc.) */
export async function adjustStockManually(input: StockAdjustmentInput) {
  const productId = Number(input.productId);

  const [variant] = await db
    .select()
    .from(productVariants)
    .where(
      and(
        eq(productVariants.productId, productId),
        eq(productVariants.sku, input.variantSku)
      )
    );

  if (!variant) {
    businessError(`Variant ${input.variantSku} not found`);
  }

  const currentStock = variant!.currentStock;
  const delta = input.newStock - currentStock;

  if (delta === 0) return; // no change

  await db.transaction(async (tx) => {
    await adjustStock({
      productId,
      variantSku: input.variantSku,
      delta,
      type: "adjustment",
      reason: input.reason,
      tx,
    });
  });
}

/** Get stock movements for a product variant */
export async function getStockMovements(
  productId: string,
  variantSku?: string,
  limit = 50
) {
  const conditions = [eq(stockMovements.productId, Number(productId))];
  if (variantSku) conditions.push(eq(stockMovements.variantSku, variantSku));

  const rows = await db
    .select()
    .from(stockMovements)
    .where(and(...conditions))
    .orderBy(desc(stockMovements.createdAt))
    .limit(limit);

  return rows.map(withId);
}

/** Get all low-stock variants across all products */
export async function getLowStockVariants() {
  const rows = await db
    .select({
      productId: products.id,
      productName: products.name,
      variantSku: productVariants.sku,
      size: productVariants.size,
      color: productVariants.color,
      currentStock: productVariants.currentStock,
      minStockAlert: products.minStockAlert,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(
      and(
        eq(products.isActive, true),
        sql`${productVariants.currentStock} <= ${products.minStockAlert}`
      )
    )
    .orderBy(asc(productVariants.currentStock));

  return rows.map((r) => ({ ...r, productId: String(r.productId) }));
}
