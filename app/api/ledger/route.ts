import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { paginatedResponse } from "@/lib/api-response";
import { getLedgerEntries } from "@/services/ledger.service";
import { LedgerPartyType } from "@/types";

export const GET = withApiHandler(async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;
  const party = searchParams.get("party") || undefined;
  const partyType = (searchParams.get("partyType") || "customer") as LedgerPartyType;
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 50;
  const dateFromStr = searchParams.get("dateFrom") || undefined;
  const dateToStr = searchParams.get("dateTo") || undefined;

  const result = await getLedgerEntries({
    party,
    partyType,
    page,
    limit,
    dateFrom: dateFromStr ? new Date(dateFromStr) : undefined,
    dateTo: dateToStr ? new Date(dateToStr) : undefined,
  });

  return paginatedResponse(result.entries, page, limit, result.total);
});
