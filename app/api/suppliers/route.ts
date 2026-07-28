import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { paginatedResponse, createdResponse } from "@/lib/api-response";
import { supplierCreateSchema } from "@/utils/zod-schemas";
import { createSupplier, listSuppliers } from "@/services/supplier.service";

export const GET = withApiHandler(async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 20;
  const search = searchParams.get("search") || undefined;
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";
  const includeInactive = searchParams.get("includeInactive") === "true";

  const result = await listSuppliers({
    page,
    limit,
    search,
    sortBy,
    sortOrder,
    includeInactive,
  });

  return paginatedResponse(result.suppliers, page, limit, result.total);
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();
  const validated = supplierCreateSchema.parse(body);
  const supplier = await createSupplier(validated);
  return createdResponse(supplier);
});
