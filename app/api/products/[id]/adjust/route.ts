import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { successResponse, notFoundResponse } from "@/lib/api-response";
import { stockAdjustmentSchema } from "@/utils/zod-schemas";
import { adjustStockManually } from "@/services/product.service";

export const POST = withApiHandler(
  async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!id) return notFoundResponse("Product");

    const body = await req.json();
    const validated = stockAdjustmentSchema.parse({ ...body, productId: id });
    await adjustStockManually(validated);
    return successResponse({ message: "Stock adjusted successfully" });
  }
);
