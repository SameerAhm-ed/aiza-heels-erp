import connectDB from "@/lib/db";
import { LedgerEntryModel } from "@/models/ledger-entry.model";
import { ClientSession, Types } from "mongoose";
import { LedgerPartyType, LedgerReferenceType } from "@/types";

interface CreateLedgerEntryParams {
  date: Date;
  referenceType: LedgerReferenceType;
  referenceId?: Types.ObjectId | string;
  debit: number; // PAISA
  credit: number; // PAISA
  party?: Types.ObjectId | string;
  partyType: LedgerPartyType;
  notes?: string;
  session: ClientSession;
}

/**
 * Append a ledger entry and compute the running balance.
 * Running balance = previous balance + credit - debit.
 *
 * For customer ledger: debit = customer owes more, credit = customer paid.
 * For supplier ledger: credit = we owe more, debit = we paid.
 * For cash ledger:    credit = cash came in, debit = cash went out.
 *
 * This function is ALWAYS called within a transaction session.
 */
export async function createLedgerEntry(
  params: CreateLedgerEntryParams
): Promise<void> {
  await connectDB();

  // Get the last running balance for this party scope
  const lastEntry = await LedgerEntryModel.findOne(
    { party: params.party ?? null, partyType: params.partyType },
    { runningBalance: 1 },
    { sort: { createdAt: -1 }, session: params.session }
  );

  const previousBalance = lastEntry?.runningBalance ?? 0;
  const runningBalance = previousBalance + params.credit - params.debit;

  await LedgerEntryModel.create(
    [
      {
        date: params.date,
        type: params.debit > 0 ? "debit" : "credit",
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        debit: params.debit,
        credit: params.credit,
        runningBalance,
        party: params.party ?? null,
        partyType: params.partyType,
        notes: params.notes,
      },
    ],
    { session: params.session }
  );
}

/**
 * Get paginated ledger entries for a given party.
 */
export async function getLedgerEntries(params: {
  party?: string;
  partyType: LedgerPartyType;
  page?: number;
  limit?: number;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  await connectDB();

  const { party, partyType, page = 1, limit = 50, dateFrom, dateTo } = params;

  const query: Record<string, unknown> = { partyType };
  if (party) query.party = new Types.ObjectId(party);
  else query.party = null;

  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) (query.date as Record<string, unknown>).$gte = dateFrom;
    if (dateTo) (query.date as Record<string, unknown>).$lte = dateTo;
  }

  const [entries, total] = await Promise.all([
    LedgerEntryModel.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    LedgerEntryModel.countDocuments(query),
  ]);

  return { entries, total, page, limit };
}
