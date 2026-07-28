import { NextRequest } from "next/server";
import { withApiHandler, businessError } from "@/lib/error-handler";
import { successResponse, notFoundResponse , isValidId} from "@/lib/api-response";
import { categoryUpdateSchema } from "@/utils/zod-schemas";
import { db } from "@/lib/db";
import { categories, products } from "@/lib/schema";
import { eq, and, count } from "drizzle-orm";

export const PUT = withApiHandler(
  async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!isValidId(id)) return notFoundResponse("Category");

    const body = await req.json();
    const validated = categoryUpdateSchema.parse(body);
    const [updated] = await db
      .update(categories)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(categories.id, Number(id)))
      .returning();
    if (!updated) return notFoundResponse("Category");
    return successResponse({ ...updated, _id: String(updated.id) });
  }
);

export const DELETE = withApiHandler(
  async (_req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!isValidId(id)) return notFoundResponse("Category");

    const categoryId = Number(id);

    // Guard: check if any products reference this category
    const [{ value: productCount }] = await db
      .select({ value: count() })
      .from(products)
      .where(and(eq(products.categoryId, categoryId), eq(products.isActive, true)));

    if (productCount > 0) {
      businessError(`Cannot delete category referenced by ${productCount} active products.`);
    }

    const [deleted] = await db
      .update(categories)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(categories.id, categoryId))
      .returning();
    if (!deleted) return notFoundResponse("Category");
    return successResponse({ ...deleted, _id: String(deleted.id) });
  }
);
