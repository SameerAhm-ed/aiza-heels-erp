import mongoose, { Schema } from "mongoose";

const ExpenseCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String },
  },
  { timestamps: true }
);

ExpenseCategorySchema.index({ name: 1 });

export const ExpenseCategoryModel =
  mongoose.models.ExpenseCategory ||
  mongoose.model("ExpenseCategory", ExpenseCategorySchema);
