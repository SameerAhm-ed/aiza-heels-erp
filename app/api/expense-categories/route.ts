import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { expenseCategoryCreateSchema } from "@/utils/zod-schemas";
import { db } from "@/lib/db";
import { expenseCategories } from "@/lib/schema";
import { asc } from "drizzle-orm";

export const GET = withApiHandler(async () => {
  const rows = await db.select().from(expenseCategories).orderBy(asc(expenseCategories.name));
  return successResponse(rows.map((row) => ({ ...row, _id: String(row.id) })));
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();
  const validated = expenseCategoryCreateSchema.parse(body);
  const [category] = await db.insert(expenseCategories).values(validated).returning();
  return createdResponse({ ...category, _id: String(category.id) });
});
