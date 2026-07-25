import connectDB from "@/lib/db";
import { ProductModel } from "@/models/product.model";
import { toPaisa } from "@/lib/currency";
import { businessError } from "@/lib/error-handler";
import {
  ProductCreateInput,
  ProductUpdateInput,
  StockAdjustmentInput,
} from "@/utils/zod-schemas";
import mongoose from "mongoose";
import { adjustStock } from "./stock.service";

export async function createProduct(input: ProductCreateInput) {
  await connectDB();

  // Convert all prices to paisa
  const variants = input.variants.map((v) => ({
    ...v,
    purchasePrice: toPaisa(v.purchasePrice),
    sellingPrice: toPaisa(v.sellingPrice),
  }));

  return ProductModel.create({ ...input, variants });
}

export async function updateProduct(id: string, input: ProductUpdateInput) {
  await connectDB();
  const update: Record<string, unknown> = { ...input };

  if (input.variants) {
    update.variants = input.variants.map((v) => ({
      ...v,
      purchasePrice: toPaisa(v.purchasePrice ?? 0),
      sellingPrice: toPaisa(v.sellingPrice ?? 0),
    }));
  }

  const product = await ProductModel.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  });
  if (!product) businessError("Product not found");
  return product;
}

export async function softDeleteProduct(id: string) {
  await connectDB();
  return ProductModel.findByIdAndUpdate(id, { isActive: false }, { new: true });
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
  await connectDB();
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

  const query: Record<string, unknown> = {};
  if (!includeInactive) query.isActive = true;
  if (categoryId) query.categoryId = categoryId;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { model: { $regex: search, $options: "i" } },
      { "variants.sku": { $regex: search, $options: "i" } },
    ];
  }
  if (lowStock) {
    // Find products where ANY variant is at or below the minStockAlert threshold
    query.$expr = {
      $gt: [
        {
          $size: {
            $filter: {
              input: "$variants",
              as: "v",
              cond: { $lte: ["$$v.currentStock", "$minStockAlert"] },
            },
          },
        },
        0,
      ],
    };
  }

  const sort: Record<string, 1 | -1> = {
    [sortBy]: sortOrder === "asc" ? 1 : -1,
  };

  const [products, total] = await Promise.all([
    ProductModel.find(query)
      .populate("categoryId", "name")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ProductModel.countDocuments(query),
  ]);

  return { products, total, page, limit };
}

export async function getProductById(id: string) {
  await connectDB();
  return ProductModel.findById(id).populate("categoryId", "name").lean();
}

/** Manual stock adjustment (damage, corrections, etc.) */
export async function adjustStockManually(input: StockAdjustmentInput) {
  await connectDB();

  const product = await ProductModel.findOne(
    { _id: input.productId, "variants.sku": input.variantSku },
    { "variants.$": 1 }
  );

  if (!product || !product.variants?.[0]) {
    businessError(`Variant ${input.variantSku} not found`);
  }

  const currentStock = product!.variants[0].currentStock;
  const delta = input.newStock - currentStock;

  if (delta === 0) return; // no change

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    await adjustStock({
      productId: input.productId,
      variantSku: input.variantSku,
      delta,
      type: "adjustment",
      reason: input.reason,
      session,
    });
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}

/** Get stock movements for a product variant */
export async function getStockMovements(
  productId: string,
  variantSku?: string,
  limit = 50
) {
  await connectDB();
  const { StockMovementModel } = await import(
    "@/models/stock-movement.model"
  );
  const query: Record<string, unknown> = { productId };
  if (variantSku) query.variantSku = variantSku;
  return StockMovementModel.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

/** Get all low-stock variants across all products */
export async function getLowStockVariants() {
  await connectDB();
  const products = await ProductModel.aggregate([
    { $match: { isActive: true } },
    { $unwind: "$variants" },
    {
      $match: {
        $expr: {
          $lte: ["$variants.currentStock", "$minStockAlert"],
        },
      },
    },
    {
      $project: {
        productId: "$_id",
        productName: "$name",
        variantSku: "$variants.sku",
        size: "$variants.size",
        color: "$variants.color",
        currentStock: "$variants.currentStock",
        minStockAlert: 1,
      },
    },
    { $sort: { currentStock: 1 } },
  ]);
  return products;
}
