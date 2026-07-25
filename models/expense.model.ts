import mongoose, { Schema } from "mongoose";

const ExpenseSchema = new Schema(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "ExpenseCategory",
      required: true,
    },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true }, // PAISA
    date: { type: Date, required: true },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank"],
      default: "cash",
    },
    attachmentPath: { type: String }, // path to receipt image
  },
  { timestamps: true }
);

ExpenseSchema.index({ categoryId: 1 });
ExpenseSchema.index({ date: -1 });
ExpenseSchema.index({ paymentMethod: 1 });

export const ExpenseModel =
  mongoose.models.Expense ||
  mongoose.model("Expense", ExpenseSchema);
