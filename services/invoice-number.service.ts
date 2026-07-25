/**
 * Atomic invoice number generation.
 * Uses MongoDB findOneAndUpdate + $inc on the InvoiceCounter collection.
 * This guarantees no duplicate invoice numbers even under concurrent requests.
 *
 * Format: INV-{YEAR}-{SEQUENCE padded to 4 digits}
 * Example: INV-2026-0001
 */
import connectDB from "@/lib/db";
import { InvoiceCounterModel } from "@/models/invoice-counter.model";
import { ClientSession } from "mongoose";

export async function generateInvoiceNumber(
  session?: ClientSession
): Promise<string> {
  await connectDB();

  const year = new Date().getFullYear().toString();

  // Atomically increment the counter for this year.
  // upsert: true creates the counter doc if it doesn't exist yet.
  const counter = await InvoiceCounterModel.findOneAndUpdate(
    { _id: year },
    { $inc: { sequence: 1 } },
    { upsert: true, new: true, session }
  );

  const paddedSequence = String(counter.sequence).padStart(4, "0");
  return `INV-${year}-${paddedSequence}`;
}
