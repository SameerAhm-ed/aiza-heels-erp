import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { successResponse, createdResponse, notFoundResponse } from "@/lib/api-response";
import { categoryCreateSchema, categoryUpdateSchema } from "@/utils/zod-schemas";
import connectDB from "@/lib/db";
import { CategoryModel } from "@/models/category.model";
import { ProductModel } from "@/models/product.model";
import { businessError } from "@/lib/error-handler";

export const GET = withApiHandler(async () => {
  await connectDB();
  const categories = await CategoryModel.find({ isActive: true }).sort({ name: 1 }).lean();
  return successResponse(categories);
});

export const POST = withApiHandler(async (req: NextRequest) => {
  await connectDB();
  const body = await req.json();
  const validated = categoryCreateSchema.parse(body);
  const category = await CategoryModel.create(validated);
  return createdResponse(category);
});
