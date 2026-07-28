import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { successResponse, notFoundResponse , isValidId} from "@/lib/api-response";
import { salePaymentSchema } from "@/utils/zod-schemas";
import { recordSalePayment } from "@/services/sale.service";

export const POST = withApiHandler(
  async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!isValidId(id)) return notFoundResponse("Sale");

    const body = await req.json();
    const validated = salePaymentSchema.parse(body);
    const updatedSale = await recordSalePayment(id, validated);
    return successResponse(updatedSale);
  }
);
