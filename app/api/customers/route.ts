import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { paginatedResponse, createdResponse } from "@/lib/api-response";
import { customerCreateSchema } from "@/utils/zod-schemas";
import { createCustomer, listCustomers } from "@/services/customer.service";

export const GET = withApiHandler(async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 20;
  const search = searchParams.get("search") || undefined;
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";

  const result = await listCustomers({
    page,
    limit,
    search,
    sortBy,
    sortOrder,
  });

  return paginatedResponse(result.customers, page, limit, result.total);
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();
  const validated = customerCreateSchema.parse(body);
  const customer = await createCustomer(validated);
  return createdResponse(customer);
});
