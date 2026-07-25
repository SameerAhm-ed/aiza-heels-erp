import mongoose, { Schema } from "mongoose";

const PurchaseItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: { type: String, required: true },
    variantSku: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true }, // PAISA
    lineTotal: { type: Number, required: true }, // PAISA
  },
  { _id: false }
);

const PurchaseSchema = new Schema(
  {
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    items: { type: [PurchaseItemSchema], required: true },
    grandTotal: { type: Number, required: true }, // PAISA
    paidAmount: { type: Number, default: 0 }, // PAISA
    remainingAmount: { type: Number, required: true }, // PAISA
    paymentMethod: {
      type: String,
      enum: ["cash", "bank"],
      default: "cash",
    },
    status: {
      type: String,
      enum: ["paid", "partial", "unpaid"],
      required: true,
    },
    notes: { type: String },
  },
  { timestamps: true }
);

PurchaseSchema.index({ supplierId: 1, createdAt: -1 });
PurchaseSchema.index({ status: 1 });
PurchaseSchema.index({ createdAt: -1 });

export const PurchaseModel =
  mongoose.models.Purchase ||
  mongoose.model("Purchase", PurchaseSchema);
