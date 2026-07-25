import { NextRequest } from "next/server";
import { withApiHandler, businessError } from "@/lib/error-handler";
import { successResponse, notFoundResponse } from "@/lib/api-response";
import { categoryUpdateSchema } from "@/utils/zod-schemas";
import connectDB from "@/lib/db";
import { CategoryModel } from "@/models/category.model";
import { ProductModel } from "@/models/product.model";

export const PUT = withApiHandler(
  async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!id) return notFoundResponse("Category");

    await connectDB();
    const body = await req.json();
    const validated = categoryUpdateSchema.parse(body);
    const updated = await CategoryModel.findByIdAndUpdate(id, validated, { new: true });
    if (!updated) return notFoundResponse("Category");
    return successResponse(updated);
  }
);

export const DELETE = withApiHandler(
  async (_req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!id) return notFoundResponse("Category");

    await connectDB();
    // Guard: check if any products reference this category
    const count = await ProductModel.countDocuments({ categoryId: id, isActive: true });
    if (count > 0) {
      businessError(`Cannot delete category referenced by ${count} active products.`);
    }

    const deleted = await CategoryModel.findByIdAndUpdate(id, { isActive: false }, { new: true });
    return successResponse(deleted);
  }
);
