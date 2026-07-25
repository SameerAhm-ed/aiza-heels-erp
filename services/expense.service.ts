import connectDB from "@/lib/db";
import { ExpenseModel } from "@/models/expense.model";
import { ExpenseCategoryModel } from "@/models/expense-category.model";
import mongoose, { Types } from "mongoose";
import { toPaisa, roundCurrency } from "@/lib/currency";
import { businessError } from "@/lib/error-handler";
import { ExpenseCreateInput } from "@/utils/zod-schemas";
import { createLedgerEntry } from "./ledger.service";
import { parseKarachiDate } from "@/lib/dates";

/**
 * Record an expense.
 *
 * Transaction steps:
 * 1. Validate category exists
 * 2. Save Expense document
 * 3. Create Expense Ledger entry
 * 4. Create Cash/Bank Ledger entry (debit = cash went out)
 * 5. Commit
 */
export async function createExpense(
  input: ExpenseCreateInput,
  attachmentPath?: string
) {
  await connectDB();

  const category = await ExpenseCategoryModel.findById(input.categoryId);
  if (!category) businessError("Expense category not found");

  const amountPaisa = toPaisa(roundCurrency(input.amount));
  const expenseDate = parseKarachiDate(input.date);

  const session = await mongoose.startSession();
  let savedExpense;

  try {
    session.startTransaction();

    const [expense] = await ExpenseModel.create(
      [
        {
          categoryId: new Types.ObjectId(input.categoryId),
          description: input.description,
          amount: amountPaisa,
          date: expenseDate,
          paymentMethod: input.paymentMethod,
          attachmentPath: attachmentPath ?? null,
        },
      ],
      { session }
    );

    savedExpense = expense;

    // Expense ledger entry
    await createLedgerEntry({
      date: expenseDate,
      referenceType: "expense",
      referenceId: expense._id,
      debit: amountPaisa,
      credit: 0,
      partyType: "expense",
      notes: `${category!.name}: ${input.description}`,
      session,
    });

    // Cash/Bank ledger: debit (cash went out)
    await createLedgerEntry({
      date: expenseDate,
      referenceType: "expense",
      referenceId: expense._id,
      debit: amountPaisa,
      credit: 0,
      partyType: "cash",
      notes: `${input.paymentMethod === "bank" ? "Bank" : "Cash"} — ${category!.name}`,
      session,
    });

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }

  return savedExpense;
}

export async function listExpenses(params: {
  page?: number;
  limit?: number;
  categoryId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  await connectDB();
  const { page = 1, limit = 20, categoryId, dateFrom, dateTo } = params;
  const query: Record<string, unknown> = {};
  if (categoryId) query.categoryId = new Types.ObjectId(categoryId);
  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) (query.date as Record<string, unknown>).$gte = dateFrom;
    if (dateTo) (query.date as Record<string, unknown>).$lte = dateTo;
  }
  const [expenses, total] = await Promise.all([
    ExpenseModel.find(query)
      .populate("categoryId", "name")
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ExpenseModel.countDocuments(query),
  ]);
  return { expenses, total, page, limit };
}

export async function getExpenseById(id: string) {
  await connectDB();
  return ExpenseModel.findById(id).populate("categoryId").lean();
}
