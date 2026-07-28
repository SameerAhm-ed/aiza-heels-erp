import { db } from "@/lib/db";
import { expenses, expenseCategories } from "@/lib/schema";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { toPaisa, roundCurrency } from "@/lib/currency";
import { businessError } from "@/lib/error-handler";
import { ExpenseCreateInput } from "@/utils/zod-schemas";
import { createLedgerEntry } from "./ledger.service";
import { parseKarachiDate } from "@/lib/dates";

/** Drizzle transaction type — same shape as `db` for query purposes. */
type DrizzleTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function withId<T extends { id: number }>(row: T) {
  return { ...row, _id: String(row.id) };
}

/**
 * Record an expense.
 *
 * Transaction steps:
 * 1. Validate category exists
 * 2. Insert expense row
 * 3. Create Expense Ledger entry
 * 4. Create Cash/Bank Ledger entry (debit = cash went out)
 * 5. Commit
 */
export async function createExpense(
  input: ExpenseCreateInput,
  attachmentPath?: string
) {
  const categoryIdNum = Number(input.categoryId);

  const [category] = await db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.id, categoryIdNum));
  if (!category) businessError("Expense category not found");

  const amountPaisa = toPaisa(roundCurrency(input.amount));
  const expenseDate = parseKarachiDate(input.date);

  const savedExpense = await db.transaction(async (tx: DrizzleTx) => {
    const [expense] = await tx
      .insert(expenses)
      .values({
        categoryId: categoryIdNum,
        description: input.description,
        amount: amountPaisa,
        date: expenseDate,
        paymentMethod: input.paymentMethod,
        attachmentPath: attachmentPath ?? null,
      })
      .returning();

    // Expense ledger entry
    await createLedgerEntry({
      date: expenseDate,
      referenceType: "expense",
      referenceId: expense.id,
      debit: amountPaisa,
      credit: 0,
      partyType: "expense",
      notes: `${category!.name}: ${input.description}`,
      tx,
    });

    // Cash/Bank ledger: debit (cash went out)
    await createLedgerEntry({
      date: expenseDate,
      referenceType: "expense",
      referenceId: expense.id,
      debit: amountPaisa,
      credit: 0,
      partyType: "cash",
      notes: `${input.paymentMethod === "bank" ? "Bank" : "Cash"} — ${category!.name}`,
      tx,
    });

    return expense;
  });

  return withId(savedExpense);
}

export async function listExpenses(params: {
  page?: number;
  limit?: number;
  categoryId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const { page = 1, limit = 20, categoryId, dateFrom, dateTo } = params;

  const conditions = [];
  if (categoryId) conditions.push(eq(expenses.categoryId, Number(categoryId)));
  if (dateFrom) conditions.push(gte(expenses.date, dateFrom));
  if (dateTo) conditions.push(lte(expenses.date, dateTo));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: expenses.id,
        categoryId: expenses.categoryId,
        description: expenses.description,
        amount: expenses.amount,
        date: expenses.date,
        paymentMethod: expenses.paymentMethod,
        attachmentPath: expenses.attachmentPath,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
        categoryName: expenseCategories.name,
      })
      .from(expenses)
      .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
      .where(whereClause)
      .orderBy(desc(expenses.date))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select().from(expenses).where(whereClause),
  ]);

  const expensesList = rows.map((row) =>
    withId({
      id: row.id,
      categoryId: row.categoryId,
      description: row.description,
      amount: row.amount,
      date: row.date,
      paymentMethod: row.paymentMethod,
      attachmentPath: row.attachmentPath,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      category: { _id: String(row.categoryId), name: row.categoryName },
    })
  );

  return { expenses: expensesList, total: totalRows.length, page, limit };
}

export async function getExpenseById(id: string) {
  const idNum = Number(id);

  const [row] = await db
    .select({
      id: expenses.id,
      categoryId: expenses.categoryId,
      description: expenses.description,
      amount: expenses.amount,
      date: expenses.date,
      paymentMethod: expenses.paymentMethod,
      attachmentPath: expenses.attachmentPath,
      createdAt: expenses.createdAt,
      updatedAt: expenses.updatedAt,
      category: expenseCategories,
    })
    .from(expenses)
    .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .where(eq(expenses.id, idNum));

  if (!row) return null;

  return withId({
    id: row.id,
    categoryId: row.categoryId,
    description: row.description,
    amount: row.amount,
    date: row.date,
    paymentMethod: row.paymentMethod,
    attachmentPath: row.attachmentPath,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    category: withId(row.category),
  });
}
