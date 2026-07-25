import connectDB from "@/lib/db";
import { SaleModel } from "@/models/sale.model";
import { ExpenseModel } from "@/models/expense.model";
import { LedgerEntryModel } from "@/models/ledger-entry.model";
import { getLowStockVariants } from "./product.service";
import {
  getKarachiDayStart,
  getKarachiDayEnd,
  getKarachiMonthStart,
  toKarachiDateString,
} from "@/lib/dates";
import { DashboardStats } from "@/types";

export async function getDashboardStats(): Promise<DashboardStats> {
  await connectDB();

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
    cashLedgerAgg,
    bankLedgerAgg,
    outstandingReceivablesAgg,
    recentSales,
    recentPurchases,
    recentExpenses,
    salesLast30DaysAgg,
    expensesByCategoryAgg,
    lowStockProducts,
  ] = await Promise.all([
    // Today's sales total (grandTotal)
    SaleModel.aggregate([
      { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: "$grandTotal" } } },
    ]),

    // Today's expenses
    ExpenseModel.aggregate([
      { $match: { date: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),

    // Monthly revenue (grandTotal of all sales this month)
    SaleModel.aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$grandTotal" } } },
    ]),

    // Monthly expenses
    ExpenseModel.aggregate([
      { $match: { date: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),

    // Cash in hand: last running balance on cash ledger (paymentMethod=cash subset)
    LedgerEntryModel.findOne(
      { partyType: "cash" },
      { runningBalance: 1 },
      { sort: { createdAt: -1 } }
    ).lean(),

    // Bank balance: derived from bank-specific transactions
    // We approximate as: total bank credits - total bank debits
    LedgerEntryModel.aggregate([
      { $match: { partyType: "cash" } },
      {
        $group: {
          _id: null,
          totalCredit: { $sum: "$credit" },
          totalDebit: { $sum: "$debit" },
        },
      },
    ]),

    // Outstanding receivables: sum of all customer running balances > 0
    LedgerEntryModel.aggregate([
      { $match: { partyType: "customer" } },
      { $sort: { party: 1, createdAt: -1 } },
      { $group: { _id: "$party", latestBalance: { $first: "$runningBalance" } } },
      { $match: { latestBalance: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$latestBalance" } } },
    ]),

    // Recent sales (last 5)
    SaleModel.find({})
      .populate("customerId", "name")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),

    // Recent purchases (last 3)
    (await import("@/models/purchase.model")).PurchaseModel.find({})
      .populate("supplierId", "name")
      .sort({ createdAt: -1 })
      .limit(3)
      .lean(),

    // Recent expenses (last 3)
    ExpenseModel.find({})
      .populate("categoryId", "name")
      .sort({ date: -1 })
      .limit(3)
      .lean(),

    // Sales last 30 days grouped by date
    SaleModel.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "Asia/Karachi",
            },
          },
          total: { $sum: "$grandTotal" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Expenses by category (current month)
    ExpenseModel.aggregate([
      { $match: { date: { $gte: monthStart } } },
      {
        $group: {
          _id: "$categoryId",
          total: { $sum: "$amount" },
        },
      },
      {
        $lookup: {
          from: "expensecategories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          category: { $ifNull: ["$category.name", "Uncategorized"] },
          total: 1,
        },
      },
      { $sort: { total: -1 } },
    ]),

    // Low stock products
    getLowStockVariants(),
  ]);

  // Build unified recent transactions feed
  const recentTransactions = [
    ...recentSales.map((s) => ({
      id: s._id.toString(),
      type: "sale" as const,
      description: `Invoice ${s.invoiceNumber} — ${(s.customerId as { name?: string })?.name ?? "Customer"}`,
      amount: s.grandTotal,
      date: s.createdAt,
      referenceNumber: s.invoiceNumber,
    })),
    ...recentPurchases.map((p) => ({
      id: p._id.toString(),
      type: "purchase" as const,
      description: `Purchase from ${(p.supplierId as { name?: string })?.name ?? "Supplier"}`,
      amount: p.grandTotal,
      date: p.createdAt,
    })),
    ...recentExpenses.map((e) => ({
      id: e._id.toString(),
      type: "expense" as const,
      description: `${(e.categoryId as { name?: string })?.name ?? "Expense"}: ${e.description}`,
      amount: e.amount,
      date: e.date,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  return {
    todaySales: todaySalesAgg[0]?.total ?? 0,
    todayExpenses: todayExpensesAgg[0]?.total ?? 0,
    cashInHand: (cashLedgerAgg as { runningBalance?: number } | null)?.runningBalance ?? 0,
    bankBalance:
      (bankLedgerAgg[0]?.totalCredit ?? 0) -
      (bankLedgerAgg[0]?.totalDebit ?? 0),
    outstandingReceivables: outstandingReceivablesAgg[0]?.total ?? 0,
    monthlyRevenue: monthlyRevenueAgg[0]?.total ?? 0,
    monthlyExpenses: monthlyExpensesAgg[0]?.total ?? 0,
    lowStockProducts,
    recentTransactions,
    salesLast30Days: salesLast30DaysAgg.map((d) => ({
      date: d._id,
      total: d.total,
      count: d.count,
    })),
    expensesByCategory: expensesByCategoryAgg.map((e) => ({
      category: e.category,
      total: e.total,
    })),
  };
}
