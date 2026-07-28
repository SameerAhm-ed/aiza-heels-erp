import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { successResponse, notFoundResponse , isValidId} from "@/lib/api-response";
import { getPurchaseById } from "@/services/purchase.service";

export const GET = withApiHandler(
  async (_req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!isValidId(id)) return notFoundResponse("Purchase");

    const purchase = await getPurchaseById(id);
    if (!purchase) return notFoundResponse("Purchase");

    return successResponse(purchase);
  }
);
