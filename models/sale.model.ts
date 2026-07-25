import mongoose, { Schema } from "mongoose";

/** All monetary amounts in PAISA */
const SaleItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: { type: String, required: true }, // snapshotted
    variantSku: { type: String, required: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true }, // PAISA
    discount: { type: Number, default: 0 }, // PAISA per-line discount
    costPrice: { type: Number, required: true }, // PAISA — COGS snapshot
    lineTotal: { type: Number, required: true }, // PAISA
  },
  { _id: false }
);

const SaleSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    items: { type: [SaleItemSchema], required: true },
    subtotal: { type: Number, required: true }, // PAISA
    discount: { type: Number, default: 0 }, // PAISA — invoice-level
    tax: { type: Number, default: 0 }, // PAISA
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
    pdfPath: { type: String },
  },
  { timestamps: true }
);

// Compound index for ledger queries and status filtering
SaleSchema.index({ customerId: 1, createdAt: -1 });
SaleSchema.index({ status: 1 });
SaleSchema.index({ createdAt: -1 });

export const SaleModel =
  mongoose.models.Sale || mongoose.model("Sale", SaleSchema);
