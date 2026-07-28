import { db } from "@/lib/db";
import { ledgerEntries, saleItems, purchaseItems } from "@/lib/schema";
import { and, eq, desc, gte, lte, isNull, sql, SQL } from "drizzle-orm";
import { LedgerPartyType, LedgerReferenceType } from "@/types";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface CreateLedgerEntryParams {
  date: Date;
  referenceType: LedgerReferenceType;
  referenceId?: number | string | null;
  debit: number; // PAISA
  credit: number; // PAISA
  party?: number | string | null;
  partyType: LedgerPartyType;
  notes?: string;
  tx: Tx;
}

/**
 * Append a ledger entry and compute the running balance.
 * Running balance = previous balance + credit - debit.
 *
 * For customer ledger: debit = customer owes more, credit = customer paid.
 * For supplier ledger: credit = we owe more, debit = we paid.
 * For cash ledger:    credit = cash came in, debit = cash went out.
 *
 * This function is ALWAYS called within a transaction (tx).
 */
export async function createLedgerEntry(
  params: CreateLedgerEntryParams
): Promise<void> {
  const party = params.party != null ? Number(params.party) : null;
  const referenceId =
    params.referenceId != null ? Number(params.referenceId) : null;

  // Get the last running balance for this party scope
  const [lastEntry] = await params.tx
    .select({ runningBalance: ledgerEntries.runningBalance })
    .from(ledgerEntries)
    .where(
      party === null
        ? and(isNull(ledgerEntries.party), eq(ledgerEntries.partyType, params.partyType))
        : and(eq(ledgerEntries.party, party), eq(ledgerEntries.partyType, params.partyType))
    )
    .orderBy(desc(ledgerEntries.createdAt))
    .limit(1);

  const previousBalance = lastEntry?.runningBalance ?? 0;
  const runningBalance = previousBalance + params.credit - params.debit;

  await params.tx.insert(ledgerEntries).values({
    date: params.date,
    type: params.debit > 0 ? "debit" : "credit",
    referenceType: params.referenceType,
    referenceId,
    debit: params.debit,
    credit: params.credit,
    runningBalance,
    party,
    partyType: params.partyType,
    notes: params.notes,
  });
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
  const { party, partyType, page = 1, limit = 50, dateFrom, dateTo } = params;

  const conditions: SQL[] = [eq(ledgerEntries.partyType, partyType)];
  if (party) {
    conditions.push(eq(ledgerEntries.party, Number(party)));
  } else if (partyType === "cash" || partyType === "expense") {
    // cash/expense ledgers have no party — always scoped to null
    conditions.push(isNull(ledgerEntries.party));
  }
  // customer/supplier with no party selected = "all accounts combined", no party filter

  if (dateFrom) conditions.push(gte(ledgerEntries.date, dateFrom));
  if (dateTo) conditions.push(lte(ledgerEntries.date, dateTo));

  const where = and(...conditions);

  const [entries, countResult] = await Promise.all([
    db
      .select()
      .from(ledgerEntries)
      .where(where)
      .orderBy(desc(ledgerEntries.date), desc(ledgerEntries.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db
      .select({ count: sql<number>`count(*)` })
      .from(ledgerEntries)
      .where(where),
  ]);

  // Attach product name + qty for entries backed by a sale/purchase invoice.
  const saleIds = [
    ...new Set(
      entries.filter((e) => e.referenceType === "sale" && e.referenceId).map((e) => e.referenceId!)
    ),
  ];
  const purchaseIds = [
    ...new Set(
      entries
        .filter((e) => e.referenceType === "purchase" && e.referenceId)
        .map((e) => e.referenceId!)
    ),
  ];

  const [saleItemRows, purchaseItemRows] = await Promise.all([
    saleIds.length
      ? db
          .select({
            saleId: saleItems.saleId,
            productName: saleItems.productName,
            variantSku: saleItems.variantSku,
            qty: saleItems.qty,
          })
          .from(saleItems)
          .where(sql`${saleItems.saleId} IN ${saleIds}`)
      : [],
    purchaseIds.length
      ? db
          .select({
            purchaseId: purchaseItems.purchaseId,
            productName: purchaseItems.productName,
            variantSku: purchaseItems.variantSku,
            qty: purchaseItems.qty,
          })
          .from(purchaseItems)
          .where(sql`${purchaseItems.purchaseId} IN ${purchaseIds}`)
      : [],
  ]);

  const itemsBySaleId = new Map<number, { productName: string; variantSku: string; qty: number }[]>();
  for (const row of saleItemRows) {
    const list = itemsBySaleId.get(row.saleId) ?? [];
    list.push(row);
    itemsBySaleId.set(row.saleId, list);
  }
  const itemsByPurchaseId = new Map<number, { productName: string; variantSku: string; qty: number }[]>();
  for (const row of purchaseItemRows) {
    const list = itemsByPurchaseId.get(row.purchaseId) ?? [];
    list.push(row);
    itemsByPurchaseId.set(row.purchaseId, list);
  }

  const mapped = entries.map((e) => ({
    ...e,
    _id: String(e.id),
    items:
      e.referenceType === "sale" && e.referenceId
        ? itemsBySaleId.get(e.referenceId) ?? []
        : e.referenceType === "purchase" && e.referenceId
        ? itemsByPurchaseId.get(e.referenceId) ?? []
        : [],
  }));
  const total = Number(countResult[0]?.count ?? 0);

  return { entries: mapped, total, page, limit };
}
