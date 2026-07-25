import mongoose, { Schema } from "mongoose";

/**
 * Immutable audit trail of every inventory change.
 * delta: positive = stock increased, negative = stock decreased.
 * resultingBalance: stock level AFTER this movement.
 * All writes go through services/stock.service.ts — never written directly.
 */
const StockMovementSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantSku: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "sale",
        "purchase",
        "adjustment",
        "return_sale",
        "return_purchase",
      ],
      required: true,
    },
    delta: { type: Number, required: true }, // negative for sales/decreases
    resultingBalance: { type: Number, required: true }, // stock after movement
    referenceId: { type: Schema.Types.ObjectId }, // saleId / purchaseId, null for adjustment
    reason: { type: String }, // required for "adjustment" type
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // immutable — no updatedAt
  }
);

StockMovementSchema.index({ productId: 1, variantSku: 1, createdAt: -1 });
StockMovementSchema.index({ referenceId: 1 });

export const StockMovementModel =
  mongoose.models.StockMovement ||
  mongoose.model("StockMovement", StockMovementSchema);
