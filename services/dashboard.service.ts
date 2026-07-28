import { db } from "@/lib/db";
import {
  sales,
  expenses,
  ledgerEntries,
  customers,
  suppliers,
  purchases,
  expenseCategories,
  products,
  productVariants,
} from "@/lib/schema";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import {
  getKarachiDayStart,
  getKarachiDayEnd,
  getKarachiMonthStart,
  toKarachiDateString,
} from "@/lib/dates";
import { DashboardStats } from "@/types";

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const todayStart = getKarachiDayStart(now);
  const todayEnd = getKarachiDayEnd(now);
  const monthStart = getKarachiMonthStart(now);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    todaySalesAgg,
    todayExpensesAgg,
    monthlyRevenueAgg,
    monthlyExpensesAgg,
    cashLedgerLatest,
    bankLedgerAgg,
    outstandingReceivablesRows,
    recentSalesRows,
    recentPurchasesRows,
    recentExpensesRows,
    salesLast30DaysRows,
    expensesByCategoryRows,
    lowStockProducts,
  ] = await Promise.all([
    // Today's sales total (grandTotal)
    db
      .select({ total: sql<number>`coalesce(sum(${sales.grandTotal}), 0)` })
      .from(sales)
      .where(and(gte(sales.createdAt, todayStart), lte(sales.createdAt, todayEnd))),

    // Today's expenses
    db
      .select({ total: sql<number>`coalesce(sum(${expenses.amount}), 0)` })
      .from(expenses)
      .where(and(gte(expenses.date, todayStart), lte(expenses.date, todayEnd))),

    // Monthly revenue (grandTotal of all sales this month)
    db
      .select({ total: sql<number>`coalesce(sum(${sales.grandTotal}), 0)` })
      .from(sales)
      .where(gte(sales.createdAt, monthStart)),

    // Monthly expenses
    db
      .select({ total: sql<number>`coalesce(sum(${expenses.amount}), 0)` })
      .from(expenses)
      .where(gte(expenses.date, monthStart)),

    // Cash in hand: last running balance on cash ledger
    db
      .select({ runningBalance: ledgerEntries.runningBalance })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.partyType, "cash"))
      .orderBy(desc(ledgerEntries.createdAt))
      .limit(1),

    // Bank balance: derived from cash-ledger-scoped transactions (matches original logic)
    db
      .select({
        totalCredit: sql<number>`coalesce(sum(${ledgerEntries.credit}), 0)`,
        totalDebit: sql<number>`coalesce(sum(${ledgerEntries.debit}), 0)`,
      })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.partyType, "cash")),

    // Outstanding receivables: latest running balance per customer party, ordered so
    // we can pick the first (most recent) row per party in JS below.
    db
      .select({
        party: ledgerEntries.party,
        runningBalance: ledgerEntries.runningBalance,
        createdAt: ledgerEntries.createdAt,
      })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.partyType, "customer"))
      .orderBy(ledgerEntries.party, desc(ledgerEntries.createdAt)),

    // Recent sales (last 5)
    db
      .select({
        id: sales.id,
        invoiceNumber: sales.invoiceNumber,
        grandTotal: sales.grandTotal,
        createdAt: sales.createdAt,
        customerName: customers.name,
      })
      .from(sales)
      .innerJoin(customers, eq(sales.customerId, customers.id))
      .orderBy(desc(sales.createdAt))
      .limit(5),

    // Recent purchases (last 3)
    db
      .select({
        id: purchases.id,
        grandTotal: purchases.grandTotal,
        createdAt: purchases.createdAt,
        supplierName: suppliers.name,
      })
      .from(purchases)
      .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .orderBy(desc(purchases.createdAt))
      .limit(3),

    // Recent expenses (last 3)
    db
      .select({
        id: expenses.id,
        description: expenses.description,
        amount: expenses.amount,
        date: expenses.date,
        categoryName: expenseCategories.name,
      })
      .from(expenses)
      .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
      .orderBy(desc(expenses.date))
      .limit(3),

    // Sales last 30 days (raw rows, grouped by Karachi date in JS below)
    db
      .select({ createdAt: sales.createdAt, grandTotal: sales.grandTotal })
      .from(sales)
      .where(gte(sales.createdAt, thirtyDaysAgo)),

    // Expenses by category (current month, raw rows grouped in JS below)
    db
      .select({ amount: expenses.amount, categoryName: expenseCategories.name })
      .from(expenses)
      .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
      .where(gte(expenses.date, monthStart)),

    // Low stock variants (join products + productVariants)
    db
      .select({
        productId: products.id,
        productName: products.name,
        variantSku: productVariants.sku,
        size: productVariants.size,
        color: productVariants.color,
        currentStock: productVariants.currentStock,
        minStockAlert: products.minStockAlert,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(
        and(
          eq(products.isActive, true),
          sql`${productVariants.currentStock} <= ${products.minStockAlert}`
        )
      )
      .orderBy(productVariants.currentStock),
  ]);

  // Reduce outstanding receivables to latest balance per party (rows are already
  // sorted party ASC, createdAt DESC so the first row per party is the latest).
  const seenParties = new Set<number | null>();
  let outstandingReceivables = 0;
  for (const row of outstandingReceivablesRows) {
    if (seenParties.has(row.party)) continue;
    seenParties.add(row.party);
    if (row.runningBalance > 0) outstandingReceivables += row.runningBalance;
  }

  // Build unified recent transactions feed
  const recentTransactions = [
    ...recentSalesRows.map((s) => ({
      id: `sale-${s.id}`,
      type: "sale" as const,
      description: `Invoice ${s.invoiceNumber} — ${s.customerName ?? "Customer"}`,
      amount: s.grandTotal,
      date: s.createdAt,
      referenceNumber: s.invoiceNumber,
    })),
    ...recentPurchasesRows.map((p) => ({
      id: `purchase-${p.id}`,
      type: "purchase" as const,
      description: `Purchase from ${p.supplierName ?? "Supplier"}`,
      amount: p.grandTotal,
      date: p.createdAt,
    })),
    ...recentExpensesRows.map((e) => ({
      id: `expense-${e.id}`,
      type: "expense" as const,
      description: `${e.categoryName ?? "Expense"}: ${e.description}`,
      amount: e.amount,
      date: e.date,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  // Group sales last 30 days by Karachi calendar date
  const salesByDay = new Map<string, { total: number; count: number }>();
  for (const row of salesLast30DaysRows) {
    const key = toKarachiDateString(row.createdAt);
    const entry = salesByDay.get(key) ?? { total: 0, count: 0 };
    entry.total += row.grandTotal;
    entry.count += 1;
    salesByDay.set(key, entry);
  }
  const salesLast30Days = Array.from(salesByDay.entries())
    .map(([date, v]) => ({ date, total: v.total, count: v.count }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // Group expenses by category (current month)
  const expensesByCategoryMap = new Map<string, number>();
  for (const row of expensesByCategoryRows) {
    const key = row.categoryName ?? "Uncategorized";
    expensesByCategoryMap.set(key, (expensesByCategoryMap.get(key) ?? 0) + row.amount);
  }
  const expensesByCategory = Array.from(expensesByCategoryMap.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  return {
    todaySales: todaySalesAgg[0]?.total ?? 0,
    todayExpenses: todayExpensesAgg[0]?.total ?? 0,
    cashInHand: cashLedgerLatest[0]?.runningBalance ?? 0,
    bankBalance: (bankLedgerAgg[0]?.totalCredit ?? 0) - (bankLedgerAgg[0]?.totalDebit ?? 0),
    outstandingReceivables,
    monthlyRevenue: monthlyRevenueAgg[0]?.total ?? 0,
    monthlyExpenses: monthlyExpensesAgg[0]?.total ?? 0,
    lowStockProducts: lowStockProducts.map((p) => ({
      productId: String(p.productId),
      productName: p.productName,
      variantSku: p.variantSku,
      size: p.size,
      color: p.color,
      currentStock: p.currentStock,
      minStockAlert: p.minStockAlert,
    })),
    recentTransactions,
    salesLast30Days,
    expensesByCategory,
  };
}
