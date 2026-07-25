import mongoose, { Schema } from "mongoose";

/**
 * Singleton settings document. _id is always "main".
 * WhatsApp credentials are NOT stored here — they're read from env vars.
 * This stores display preferences and default values only.
 */
const SettingsSchema = new Schema(
  {
    _id: { type: String, default: "main" },
    appName: { type: String, default: "HeelCraft ERP" },
    currency: { type: String, default: "PKR" },
    /** Default tax percentage, e.g. 17 for 17% GST. Applied to new invoices. */
    taxRate: { type: Number, default: 0 },
    /** Fallback low-stock threshold if product has no custom minStockAlert */
    lowStockThreshold: { type: Number, default: 5 },
  },
  {
    _id: false,
    timestamps: true,
  }
);

export const SettingsModel =
  mongoose.models.Settings ||
  mongoose.model("Settings", SettingsSchema);
