import { NextRequest } from "next/server";
import { withApiHandler, businessError } from "@/lib/error-handler";
import { successResponse, notFoundResponse , isValidId} from "@/lib/api-response";
import { expenseCategoryUpdateSchema } from "@/utils/zod-schemas";
import { db } from "@/lib/db";
import { expenseCategories, expenses } from "@/lib/schema";
import { eq, count } from "drizzle-orm";

export const PUT = withApiHandler(
  async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!isValidId(id)) return notFoundResponse("Expense Category");

    const body = await req.json();
    const validated = expenseCategoryUpdateSchema.parse(body);
    const [updated] = await db
      .update(expenseCategories)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(expenseCategories.id, Number(id)))
      .returning();
    if (!updated) return notFoundResponse("Expense Category");
    return successResponse({ ...updated, _id: String(updated.id) });
  }
);

export const DELETE = withApiHandler(
  async (_req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!isValidId(id)) return notFoundResponse("Expense Category");

    const categoryId = Number(id);

    const [{ value: expenseCount }] = await db
      .select({ value: count() })
      .from(expenses)
      .where(eq(expenses.categoryId, categoryId));

    if (expenseCount > 0) {
      businessError(`Cannot delete expense category referenced by ${expenseCount} expense records.`);
    }

    const [deleted] = await db
      .delete(expenseCategories)
      .where(eq(expenseCategories.id, categoryId))
      .returning();
    if (!deleted) return notFoundResponse("Expense Category");
    return successResponse({ ...deleted, _id: String(deleted.id) });
  }
);
