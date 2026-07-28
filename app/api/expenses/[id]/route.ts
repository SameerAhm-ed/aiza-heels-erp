import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { successResponse, notFoundResponse , isValidId} from "@/lib/api-response";
import { getExpenseById } from "@/services/expense.service";

export const GET = withApiHandler(
  async (_req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!isValidId(id)) return notFoundResponse("Expense");

    const expense = await getExpenseById(id);
    if (!expense) return notFoundResponse("Expense");

    return successResponse(expense);
  }
);
