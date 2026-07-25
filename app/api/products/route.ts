import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { paginatedResponse, createdResponse } from "@/lib/api-response";
import { productCreateSchema } from "@/utils/zod-schemas";
import { createProduct, listProducts } from "@/services/product.service";

export const GET = withApiHandler(async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 20;
  const search = searchParams.get("search") || undefined;
  const categoryId = searchParams.get("categoryId") || undefined;
  const lowStock = searchParams.get("lowStock") === "true";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";

  const result = await listProducts({
    page,
    limit,
    search,
    categoryId,
    lowStock,
    sortBy,
    sortOrder,
  });

  return paginatedResponse(result.products, page, limit, result.total);
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();
  const validated = productCreateSchema.parse(body);
  const product = await createProduct(validated);
  return createdResponse(product);
});
