import mongoose, { Schema } from "mongoose";

/**
 * Atomic invoice counter using MongoDB's findOneAndUpdate + $inc.
 * _id is the year string (e.g., "2026").
 * sequence increments from 0; invoice number = `INV-{year}-{sequence.padStart(4, '0')}`.
 *
 * Using findOneAndUpdate with upsert ensures no race conditions even under concurrent requests.
 */
const InvoiceCounterSchema = new Schema(
  {
    _id: { type: String }, // year, e.g. "2026"
    sequence: { type: Number, default: 0 },
  },
  { _id: false }
);

export const InvoiceCounterModel =
  mongoose.models.InvoiceCounter ||
  mongoose.model("InvoiceCounter", InvoiceCounterSchema);
