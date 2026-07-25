import { NextRequest } from "next/server";
import { withApiHandler, businessError } from "@/lib/error-handler";
import { successResponse, createdResponse, notFoundResponse } from "@/lib/api-response";
import { expenseCategoryCreateSchema, expenseCategoryUpdateSchema } from "@/utils/zod-schemas";
import connectDB from "@/lib/db";
import { ExpenseCategoryModel } from "@/models/expense-category.model";

export const GET = withApiHandler(async () => {
  await connectDB();
  const categories = await ExpenseCategoryModel.find({}).sort({ name: 1 }).lean();
  return successResponse(categories);
});

export const POST = withApiHandler(async (req: NextRequest) => {
  await connectDB();
  const body = await req.json();
  const validated = expenseCategoryCreateSchema.parse(body);
  const category = await ExpenseCategoryModel.create(validated);
  return createdResponse(category);
});
