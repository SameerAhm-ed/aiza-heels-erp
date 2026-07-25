import mongoose, { Schema } from "mongoose";

/**
 * Variant sub-document: each variant = unique size+color combination.
 * All prices are in PAISA.
 */
const ProductVariantSchema = new Schema(
  {
    sku: { type: String, required: true, trim: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    currentStock: { type: Number, required: true, default: 0 },
    purchasePrice: { type: Number, required: true, default: 0 }, // PAISA
    sellingPrice: { type: Number, required: true, default: 0 }, // PAISA
  },
  { _id: false } // No separate _id for sub-documents; sku is the identifier
);

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    model: { type: String, trim: true }, // heel model name
    material: { type: String, trim: true },
    unit: { type: String, default: "pair" },
    minStockAlert: { type: Number, default: 5 }, // alert threshold (pairs)
    isActive: { type: Boolean, default: true },
    variants: [ProductVariantSchema],
  },
  { timestamps: true }
);

// Unique SKU enforcement across the entire collection
ProductSchema.index({ "variants.sku": 1 }, { unique: true, sparse: true });
// Fast queries for low stock
ProductSchema.index({ "variants.currentStock": 1 });
// Text search
ProductSchema.index({ name: "text", model: "text", material: "text" });
ProductSchema.index({ categoryId: 1 });
ProductSchema.index({ isActive: 1 });

export const ProductModel =
  mongoose.models.Product ||
  mongoose.model("Product", ProductSchema);
