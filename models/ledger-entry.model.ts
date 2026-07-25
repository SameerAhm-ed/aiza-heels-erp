import mongoose, { Schema } from "mongoose";

/**
 * Single ledger collection with partyType discriminator.
 * Covers: Customer Ledger, Supplier Ledger, Cash Ledger, Expense Ledger.
 *
 * runningBalance is computed and stored at write time per (party, partyType) scope
 * for O(1) ledger display without aggregation on every page load.
 * All amounts in PAISA.
 */
const LedgerEntrySchema = new Schema(
  {
    date: { type: Date, required: true },
    type: {
      type: String,
      enum: ["debit", "credit"],
      required: true,
    },
    referenceType: {
      type: String,
      enum: [
        "sale",
        "purchase",
        "expense",
        "payment",
        "adjustment",
        "opening_balance",
      ],
      required: true,
    },
    referenceId: { type: Schema.Types.ObjectId },
    debit: { type: Number, default: 0 }, // PAISA
    credit: { type: Number, default: 0 }, // PAISA
    runningBalance: { type: Number, required: true }, // PAISA
    party: { type: Schema.Types.ObjectId }, // customerId or supplierId; null for cash/expense
    partyType: {
      type: String,
      enum: ["customer", "supplier", "cash", "expense"],
      required: true,
    },
    notes: { type: String },
  },
  { timestamps: true }
);

// Primary lookup index: get all ledger entries for a given party in date order
LedgerEntrySchema.index({ party: 1, partyType: 1, date: -1 });
// Cash ledger queries (partyType=cash, no party)
LedgerEntrySchema.index({ partyType: 1, date: -1 });
// Reference lookup: find ledger entry for a given document
LedgerEntrySchema.index({ referenceId: 1 });

export const LedgerEntryModel =
  mongoose.models.LedgerEntry ||
  mongoose.model("LedgerEntry", LedgerEntrySchema);
