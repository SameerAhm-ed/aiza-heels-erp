import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { successResponse, notFoundResponse , isValidId} from "@/lib/api-response";
import { productUpdateSchema } from "@/utils/zod-schemas";
import {
  getProductById,
  updateProduct,
  softDeleteProduct,
  getStockMovements,
} from "@/services/product.service";

export const GET = withApiHandler(
  async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!isValidId(id)) return notFoundResponse("Product");

    const product = await getProductById(id);
    if (!product) return notFoundResponse("Product");

    const variantSku = req.nextUrl.searchParams.get("variantSku") || undefined;
    const movements = await getStockMovements(id, variantSku);

    return successResponse({
      ...product,
      movements,
    });
  }
);

export const PUT = withApiHandler(
  async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!isValidId(id)) return notFoundResponse("Product");

    const body = await req.json();
    const validated = productUpdateSchema.parse(body);
    const updated = await updateProduct(id, validated);
    return successResponse(updated);
  }
);

export const DELETE = withApiHandler(
  async (_req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!isValidId(id)) return notFoundResponse("Product");

    const deleted = await softDeleteProduct(id);
    return successResponse(deleted);
  }
);
