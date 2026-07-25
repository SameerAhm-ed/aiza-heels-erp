import mongoose, { Schema } from "mongoose";

const SupplierSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    notes: { type: String },
    /** Opening balance in PAISA. Positive = we owe supplier. */
    openingBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SupplierSchema.index({ name: "text", phone: "text" });
SupplierSchema.index({ isActive: 1 });
SupplierSchema.index({ name: 1 });

export const SupplierModel =
  mongoose.models.Supplier ||
  mongoose.model("Supplier", SupplierSchema);
