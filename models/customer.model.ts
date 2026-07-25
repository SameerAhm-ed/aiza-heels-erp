import mongoose, { Schema } from "mongoose";

const CustomerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    whatsappNumber: { type: String, trim: true },
    address: { type: String, trim: true },
    notes: { type: String },
    /** Opening balance in PAISA. Positive = customer owes us. */
    openingBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Fast search by name/phone
CustomerSchema.index({ name: "text", phone: "text" });
CustomerSchema.index({ isActive: 1 });
CustomerSchema.index({ name: 1 });

export const CustomerModel =
  mongoose.models.Customer ||
  mongoose.model("Customer", CustomerSchema);
