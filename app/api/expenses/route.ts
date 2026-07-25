import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { paginatedResponse, createdResponse } from "@/lib/api-response";
import { expenseCreateSchema } from "@/utils/zod-schemas";
import { createExpense, listExpenses } from "@/services/expense.service";

export const GET = withApiHandler(async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 20;
  const categoryId = searchParams.get("categoryId") || undefined;
  const dateFromStr = searchParams.get("dateFrom") || undefined;
  const dateToStr = searchParams.get("dateTo") || undefined;

  const result = await listExpenses({
    page,
    limit,
    categoryId,
    dateFrom: dateFromStr ? new Date(dateFromStr) : undefined,
    dateTo: dateToStr ? new Date(dateToStr) : undefined,
  });

  return paginatedResponse(result.expenses, page, limit, result.total);
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();
  const { attachmentPath, ...expenseFields } = body;
  const validated = expenseCreateSchema.parse(expenseFields);
  const expense = await createExpense(validated, attachmentPath);
  return createdResponse(expense);
});
