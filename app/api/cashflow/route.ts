import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { successResponse } from "@/lib/api-response";
import connectDB from "@/lib/db";
import { LedgerEntryModel } from "@/models/ledger-entry.model";
import { getKarachiDayStart, getKarachiDayEnd, parseKarachiDate } from "@/lib/dates";

export const GET = withApiHandler(async (req: NextRequest) => {
  await connectDB();
  const searchParams = req.nextUrl.searchParams;

  const dateFromStr = searchParams.get("dateFrom");
  const dateToStr = searchParams.get("dateTo");
  const methodFilter = searchParams.get("method") || "all"; // "cash", "bank", or "all"

  const now = new Date();
  const dateFrom = dateFromStr ? parseKarachiDate(dateFromStr) : getKarachiDayStart(now);
  const dateTo = dateToStr ? new Date(`${dateToStr}T23:59:59+05:00`) : getKarachiDayEnd(now);

  // 1. Opening Balance: Sum of credits - debits BEFORE dateFrom on cash ledger
  const openingAgg = await LedgerEntryModel.aggregate([
    {
      $match: {
        partyType: "cash",
        date: { $lt: dateFrom },
      },
    },
    {
      $group: {
        _id: null,
        totalCredit: { $sum: "$credit" },
        totalDebit: { $sum: "$debit" },
      },
    },
  ]);

  const openingBalance =
    (openingAgg[0]?.totalCredit ?? 0) - (openingAgg[0]?.totalDebit ?? 0);

  // 2. Cash In & Cash Out during the selected period
  const periodAgg = await LedgerEntryModel.aggregate([
    {
      $match: {
        partyType: "cash",
        date: { $gte: dateFrom, $lte: dateTo },
      },
    },
    {
      $group: {
        _id: "$referenceType",
        totalCredit: { $sum: "$credit" },
        totalDebit: { $sum: "$debit" },
      },
    },
  ]);

  let cashIn = 0;
  let cashOut = 0;

  periodAgg.forEach((item) => {
    // credit on cash ledger = money in
    cashIn += item.totalCredit || 0;
    // debit on cash ledger = money out
    cashOut += item.totalDebit || 0;
  });

  const closingBalance = openingBalance + cashIn - cashOut;

  // 3. Breakdown by day within the period
  const dailyBreakdown = await LedgerEntryModel.aggregate([
    {
      $match: {
        partyType: "cash",
        date: { $gte: dateFrom, $lte: dateTo },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$date",
            timezone: "Asia/Karachi",
          },
        },
        inflow: { $sum: "$credit" },
        outflow: { $sum: "$debit" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return successResponse({
    openingBalance,
    cashIn,
    cashOut,
    closingBalance,
    dailyBreakdown: dailyBreakdown.map((d) => ({
      date: d._id,
      cashIn: d.inflow,
      cashOut: d.outflow,
      net: d.inflow - d.outflow,
    })),
  });
});
