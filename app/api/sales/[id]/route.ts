import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { successResponse, notFoundResponse , isValidId} from "@/lib/api-response";
import { getSaleById } from "@/services/sale.service";

export const GET = withApiHandler(
  async (_req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!isValidId(id)) return notFoundResponse("Sale");

    const sale = await getSaleById(id);
    if (!sale) return notFoundResponse("Sale");

    return successResponse(sale);
  }
);
