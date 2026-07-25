import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { paginatedResponse, createdResponse } from "@/lib/api-response";
import { purchaseCreateSchema } from "@/utils/zod-schemas";
import { createPurchase, listPurchases } from "@/services/purchase.service";

export const GET = withApiHandler(async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 20;
  const supplierId = searchParams.get("supplierId") || undefined;
  const status = searchParams.get("status") || undefined;
  const dateFromStr = searchParams.get("dateFrom") || undefined;
  const dateToStr = searchParams.get("dateTo") || undefined;

  const result = await listPurchases({
    page,
    limit,
    supplierId,
    status,
    dateFrom: dateFromStr ? new Date(dateFromStr) : undefined,
    dateTo: dateToStr ? new Date(dateToStr) : undefined,
  });

  return paginatedResponse(result.purchases, page, limit, result.total);
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();
  const validated = purchaseCreateSchema.parse(body);
  const purchase = await createPurchase(validated);
  return createdResponse(purchase);
});
