import { db } from "@/lib/db";
import {
  sales,
  saleItems,
  expenses,
  expenseCategories,
  products,
  productVariants,
  customers,
  categories,
} from "@/lib/schema";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

function withId<T extends { id: number }>(row: T) {
  return { ...row, _id: String(row.id) };
}

export async function getSalesReport(dateFrom: Date, dateTo: Date) {
  const rows = await db
    .select({
      id: sales.id,
      invoiceNumber: sales.invoiceNumber,
      customerId: sales.customerId,
      subtotal: sales.subtotal,
      discount: sales.discount,
      tax: sales.tax,
      grandTotal: sales.grandTotal,
      paidAmount: sales.paidAmount,
      remainingAmount: sales.remainingAmount,
      paymentMethod: sales.paymentMethod,
      status: sales.status,
      notes: sales.notes,
      pdfPath: sales.pdfPath,
      createdAt: sales.createdAt,
      updatedAt: sales.updatedAt,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(sales)
    .innerJoin(customers, eq(sales.customerId, customers.id))
    .where(and(gte(sales.createdAt, dateFrom), lte(sales.createdAt, dateTo)))
    .orderBy(desc(sales.createdAt));

  const salesList = rows.map((row) =>
    withId({
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      customerId: row.customerId,
      subtotal: row.subtotal,
      discount: row.discount,
      tax: row.tax,
      grandTotal: row.grandTotal,
      paidAmount: row.paidAmount,
      remainingAmount: row.remainingAmount,
      paymentMethod: row.paymentMethod,
      status: row.status,
      notes: row.notes,
      pdfPath: row.pdfPath,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      customer: { _id: String(row.customerId), name: row.customerName, phone: row.customerPhone },
    })
  );

  const totalRevenue = salesList.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalPaid = salesList.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalRemaining = salesList.reduce((sum, s) => sum + s.remainingAmount, 0);

  return { sales: salesList, totalRevenue, totalPaid, totalRemaining };
}

export async function getExpenseReport(dateFrom: Date, dateTo: Date, categoryId?: string) {
  const conditions = [gte(expenses.date, dateFrom), lte(expenses.date, dateTo)];
  if (categoryId) conditions.push(eq(expenses.categoryId, Number(categoryId)));

  const rows = await db
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
    .where(and(...conditions))
    .orderBy(desc(expenses.date));

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

  const totalExpense = expensesList.reduce((sum, e) => sum + e.amount, 0);

  return { expenses: expensesList, totalExpense };
}

export async function getProfitReport(dateFrom: Date, dateTo: Date) {
  // 1. Sales revenue (grandTotal of all sales in range)
  const [salesAgg] = await db
    .select({
      totalRevenue: sql<number>`coalesce(sum(${sales.grandTotal}), 0)`,
    })
    .from(sales)
    .where(and(gte(sales.createdAt, dateFrom), lte(sales.createdAt, dateTo)));

  // 2. COGS: sum(costPrice * qty) across all sale items whose parent sale is in range
  const [cogsAgg] = await db
    .select({
      totalCOGS: sql<number>`coalesce(sum(${saleItems.costPrice} * ${saleItems.qty}), 0)`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(and(gte(sales.createdAt, dateFrom), lte(sales.createdAt, dateTo)));

  const [expenseAgg] = await db
    .select({ total: sql<number>`coalesce(sum(${expenses.amount}), 0)` })
    .from(expenses)
    .where(and(gte(expenses.date, dateFrom), lte(expenses.date, dateTo)));

  const revenue = salesAgg?.totalRevenue ?? 0;
  const cogs = cogsAgg?.totalCOGS ?? 0;
  const expensesTotal = expenseAgg?.total ?? 0;
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - expensesTotal;

  return {
    revenue,
    cogs,
    expenses: expensesTotal,
    grossProfit,
    netProfit,
  };
}

export async function getInventoryValuationReport() {
  const rows = await db
    .select({
      productId: products.id,
      name: products.name,
      categoryName: categories.name,
      currentStock: productVariants.currentStock,
      purchasePrice: productVariants.purchasePrice,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .where(eq(products.isActive, true));

  // Group variant rows back up per product
  const byProduct = new Map<
    number,
    { productId: number; name: string; categoryName: string; stockCount: number; valuationPaisa: number }
  >();

  for (const row of rows) {
    const entry = byProduct.get(row.productId) ?? {
      productId: row.productId,
      name: row.name,
      categoryName: row.categoryName || "General",
      stockCount: 0,
      valuationPaisa: 0,
    };
    if (row.currentStock != null) {
      entry.stockCount += row.currentStock;
      entry.valuationPaisa += row.currentStock * (row.purchasePrice ?? 0);
    }
    byProduct.set(row.productId, entry);
  }

  const items = Array.from(byProduct.values()).map((p) => ({
    productId: String(p.productId),
    name: p.name,
    categoryName: p.categoryName,
    stockCount: p.stockCount,
    valuationPaisa: p.valuationPaisa,
  }));

  const totalStockCount = items.reduce((sum, i) => sum + i.stockCount, 0);
  const totalValuation = items.reduce((sum, i) => sum + i.valuationPaisa, 0);

  return { items, totalStockCount, totalValuation };
}

export async function getTopSellingProducts(dateFrom: Date, dateTo: Date, limit = 10) {
  const rows = await db
    .select({
      variantSku: saleItems.variantSku,
      productName: saleItems.productName,
      size: saleItems.size,
      color: saleItems.color,
      qty: saleItems.qty,
      lineTotal: saleItems.lineTotal,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(and(gte(sales.createdAt, dateFrom), lte(sales.createdAt, dateTo)));

  const byVariant = new Map<
    string,
    { variantSku: string; productName: string; size: string; color: string; totalQty: number; totalRevenue: number }
  >();

  for (const row of rows) {
    const entry = byVariant.get(row.variantSku) ?? {
      variantSku: row.variantSku,
      productName: row.productName,
      size: row.size,
      color: row.color,
      totalQty: 0,
      totalRevenue: 0,
    };
    entry.totalQty += row.qty;
    entry.totalRevenue += row.lineTotal;
    byVariant.set(row.variantSku, entry);
  }

  return Array.from(byVariant.values())
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, limit);
}
