import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { successResponse } from "@/lib/api-response";
import { db } from "@/lib/db";
import { ledgerEntries } from "@/lib/schema";
import { and, eq, gte, lte, lt, sql } from "drizzle-orm";
import { getKarachiDayStart, getKarachiDayEnd, parseKarachiDate } from "@/lib/dates";

export const GET = withApiHandler(async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;

  const dateFromStr = searchParams.get("dateFrom");
  const dateToStr = searchParams.get("dateTo");
  // methodFilter kept for parity with previous signature (not currently applied to the cash ledger query)
  const methodFilter = searchParams.get("method") || "all"; // "cash", "bank", or "all"

  const now = new Date();
  const dateFrom = dateFromStr ? parseKarachiDate(dateFromStr) : getKarachiDayStart(now);
  const dateTo = dateToStr ? new Date(`${dateToStr}T23:59:59+05:00`) : getKarachiDayEnd(now);

  // 1. Opening Balance: Sum of credits - debits BEFORE dateFrom on cash ledger
  const [openingAgg] = await db
    .select({
      totalCredit: sql<number>`coalesce(sum(${ledgerEntries.credit}), 0)`,
      totalDebit: sql<number>`coalesce(sum(${ledgerEntries.debit}), 0)`,
    })
    .from(ledgerEntries)
    .where(and(eq(ledgerEntries.partyType, "cash"), lt(ledgerEntries.date, dateFrom)));

  const openingBalance = (openingAgg?.totalCredit ?? 0) - (openingAgg?.totalDebit ?? 0);

  // 2. Cash In & Cash Out during the selected period
  const periodAgg = await db
    .select({
      referenceType: ledgerEntries.referenceType,
      totalCredit: sql<number>`coalesce(sum(${ledgerEntries.credit}), 0)`,
      totalDebit: sql<number>`coalesce(sum(${ledgerEntries.debit}), 0)`,
    })
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.partyType, "cash"),
        gte(ledgerEntries.date, dateFrom),
        lte(ledgerEntries.date, dateTo)
      )
    )
    .groupBy(ledgerEntries.referenceType);

  let cashIn = 0;
  let cashOut = 0;

  periodAgg.forEach((item) => {
    // credit on cash ledger = money in
    cashIn += item.totalCredit || 0;
    // debit on cash ledger = money out
    cashOut += item.totalDebit || 0;
  });

  const closingBalance = openingBalance + cashIn - cashOut;

  // 3. Breakdown by day within the period (grouped in Asia/Karachi time)
  const dailyBreakdown = await db
    .select({
      day: sql<string>`strftime('%Y-%m-%d', ${ledgerEntries.date} / 1000, 'unixepoch', '+5 hours')`,
      inflow: sql<number>`coalesce(sum(${ledgerEntries.credit}), 0)`,
      outflow: sql<number>`coalesce(sum(${ledgerEntries.debit}), 0)`,
    })
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.partyType, "cash"),
        gte(ledgerEntries.date, dateFrom),
        lte(ledgerEntries.date, dateTo)
      )
    )
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  return successResponse({
    openingBalance,
    cashIn,
    cashOut,
    closingBalance,
    dailyBreakdown: dailyBreakdown.map((d) => ({
      date: d.day,
      cashIn: d.inflow,
      cashOut: d.outflow,
      net: d.inflow - d.outflow,
    })),
  });
});
