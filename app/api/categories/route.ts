import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { categoryCreateSchema } from "@/utils/zod-schemas";
import { db } from "@/lib/db";
import { categories } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

export const GET = withApiHandler(async () => {
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.name));

  return successResponse(rows.map((row) => ({ ...row, _id: String(row.id) })));
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();
  const validated = categoryCreateSchema.parse(body);
  const [category] = await db.insert(categories).values(validated).returning();
  return createdResponse({ ...category, _id: String(category.id) });
});
