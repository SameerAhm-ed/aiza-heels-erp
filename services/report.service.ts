import connectDB from "@/lib/db";
import { SaleModel } from "@/models/sale.model";
import { PurchaseModel } from "@/models/purchase.model";
import { ExpenseModel } from "@/models/expense.model";
import { ProductModel } from "@/models/product.model";
import { getCustomerOutstandingBalances } from "./customer.service";
import { getSupplierOutstandingBalances } from "./supplier.service";
import { parseKarachiDate } from "@/lib/dates";

export async function getSalesReport(dateFrom: Date, dateTo: Date) {
  await connectDB();

  const sales = await SaleModel.find({
    createdAt: { $gte: dateFrom, $lte: dateTo },
  })
    .populate("customerId", "name phone")
    .sort({ createdAt: -1 })
    .lean();

  const totalRevenue = sales.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalPaid = sales.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalRemaining = sales.reduce((sum, s) => sum + s.remainingAmount, 0);

  return { sales, totalRevenue, totalPaid, totalRemaining };
}

export async function getExpenseReport(dateFrom: Date, dateTo: Date, categoryId?: string) {
  await connectDB();

  const query: Record<string, unknown> = {
    date: { $gte: dateFrom, $lte: dateTo },
  };
  if (categoryId) query.categoryId = categoryId;

  const expenses = await ExpenseModel.find(query)
    .populate("categoryId", "name")
    .sort({ date: -1 })
    .lean();

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  return { expenses, totalExpense };
}

export async function getProfitReport(dateFrom: Date, dateTo: Date) {
  await connectDB();

  // 1. Sales revenue & COGS snapshot sum
  const salesAgg = await SaleModel.aggregate([
    { $match: { createdAt: { $gte: dateFrom, $lte: dateTo } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$grandTotal" }, // grandTotal of sales
        totalCOGS: { $sum: { $multiply: ["$items.costPrice", "$items.qty"] } },
      },
    },
  ]);

  // 2. Expenses total
  const expenseAgg = await ExpenseModel.aggregate([
    { $match: { date: { $gte: dateFrom, $lte: dateTo } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const revenue = salesAgg[0]?.totalRevenue ?? 0;
  const cogs = salesAgg[0]?.totalCOGS ?? 0;
  const expenses = expenseAgg[0]?.total ?? 0;
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - expenses;

  return {
    revenue,
    cogs,
    expenses,
    grossProfit,
    netProfit,
  };
}

export async function getInventoryValuationReport() {
  await connectDB();

  const products = await ProductModel.find({ isActive: true })
    .populate("categoryId", "name")
    .lean();

  let totalValuation = 0;
  let totalStockCount = 0;

  const items = products.map((p) => {
    const pStock = p.variants.reduce((sum: number, v: any) => sum + v.currentStock, 0);
    const pValuation = p.variants.reduce(
      (sum: number, v: any) => sum + v.currentStock * v.purchasePrice,
      0
    );

    totalStockCount += pStock;
    totalValuation += pValuation;

    return {
      productId: p._id.toString(),
      name: p.name,
      categoryName: (p.categoryId as { name?: string })?.name || "General",
      stockCount: pStock,
      valuationPaisa: pValuation,
    };
  });

  return { items, totalStockCount, totalValuation };
}

export async function getTopSellingProducts(dateFrom: Date, dateTo: Date, limit = 10) {
  await connectDB();

  const result = await SaleModel.aggregate([
    { $match: { createdAt: { $gte: dateFrom, $lte: dateTo } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.variantSku",
        productName: { $first: "$items.productName font" },
        size: { $first: "$items.size" },
        color: { $first: "$items.color" },
        totalQty: { $sum: "$items.qty" },
        totalRevenue: { $sum: "$items.lineTotal font" },
      },
    },
    { $sort: { totalQty: -1 } },
    { $limit: limit },
  ]);

  return result.map((r) => ({
    variantSku: r._id,
    productName: r.productName || r._id,
    size: r.size,
    color: r.color,
    totalQty: r.totalQty,
    totalRevenue: r.totalRevenue,
  }));
}
