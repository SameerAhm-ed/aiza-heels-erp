import { NextRequest } from "next/server";
import { withApiHandler, businessError } from "@/lib/error-handler";
import { successResponse, notFoundResponse } from "@/lib/api-response";
import { expenseCategoryUpdateSchema } from "@/utils/zod-schemas";
import connectDB from "@/lib/db";
import { ExpenseCategoryModel } from "@/models/expense-category.model";
import { ExpenseModel } from "@/models/expense.model";

export const PUT = withApiHandler(
  async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!id) return notFoundResponse("Expense Category");

    await connectDB();
    const body = await req.json();
    const validated = expenseCategoryUpdateSchema.parse(body);
    const updated = await ExpenseCategoryModel.findByIdAndUpdate(id, validated, { new: true });
    if (!updated) return notFoundResponse("Expense Category");
    return successResponse(updated);
  }
);

export const DELETE = withApiHandler(
  async (_req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!id) return notFoundResponse("Expense Category");

    await connectDB();
    const count = await ExpenseModel.countDocuments({ categoryId: id });
    if (count > 0) {
      businessError(`Cannot delete expense category referenced by ${count} expense records.`);
    }

    const deleted = await ExpenseCategoryModel.findByIdAndDelete(id);
    return successResponse(deleted);
  }
);
