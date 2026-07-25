import { NextRequest, NextResponse } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { notFoundResponse } from "@/lib/api-response";
import Papa from "papaparse";
import {
  getSalesReport,
  getExpenseReport,
  getProfitReport,
  getInventoryValuationReport,
  getTopSellingProducts,
} from "@/services/report.service";
import { getCustomerOutstandingBalances } from "@/services/customer.service";
import { getSupplierOutstandingBalances } from "@/services/supplier.service";
import { parseKarachiDate, getKarachiMonthStart, getKarachiDayEnd, formatDate } from "@/lib/dates";
import { fromPaisa } from "@/lib/currency";

export const GET = withApiHandler(
  async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { type } = await (context?.params ?? Promise.resolve({ type: "" }));
    const searchParams = req.nextUrl.searchParams;

    const dateFromStr = searchParams.get("dateFrom");
    const dateToStr = searchParams.get("dateTo");

    const now = new Date();
    const dateFrom = dateFromStr ? parseKarachiDate(dateFromStr) : getKarachiMonthStart(now);
    const dateTo = dateToStr ? new Date(`${dateToStr}T23:59:59+05:00`) : getKarachiDayEnd(now);

    let rows: Record<string, unknown>[] = [];

    if (type === "sales") {
      const { sales } = await getSalesReport(dateFrom, dateTo);
      rows = sales.map((s) => ({
        "Invoice Number": s.invoiceNumber,
        "Customer Name": (s.customerId as { name?: string })?.name || "Customer",
        Date: formatDate(s.createdAt),
        "Grand Total (PKR)": fromPaisa(s.grandTotal),
        "Paid Amount (PKR)": fromPaisa(s.paidAmount),
        "Remaining (PKR)": fromPaisa(s.remainingAmount),
        Status: s.status.toUpperCase(),
        "Payment Method": s.paymentMethod.toUpperCase(),
      }));
    } else if (type === "expenses") {
      const { expenses } = await getExpenseReport(dateFrom, dateTo);
      rows = expenses.map((e) => ({
        Category: (e.categoryId as { name?: string })?.name || "General",
        Description: e.description,
        Date: formatDate(e.date),
        "Amount (PKR)": fromPaisa(e.amount),
        "Payment Method": e.paymentMethod.toUpperCase(),
      }));
    } else if (type === "profit") {
      const p = await getProfitReport(dateFrom, dateTo);
      rows = [
        { Metric: "Total Revenue (PKR)", Amount: fromPaisa(p.revenue) },
        { Metric: "Cost of Goods Sold - COGS (PKR)", Amount: fromPaisa(p.cogs) },
        { Metric: "Gross Profit (PKR)", Amount: fromPaisa(p.grossProfit) },
        { Metric: "Total Operational Expenses (PKR)", Amount: fromPaisa(p.expenses) },
        { Metric: "Net Profit (PKR)", Amount: fromPaisa(p.netProfit) },
      ];
    } else if (type === "inventory") {
      const inv = await getInventoryValuationReport();
      rows = inv.items.map((i) => ({
        "Product Name": i.name,
        Category: i.categoryName,
        "Current Stock (Pairs)": i.stockCount,
        "Valuation (PKR)": fromPaisa(i.valuationPaisa),
      }));
    } else if (type === "customer-outstanding") {
      const list = await getCustomerOutstandingBalances();
      rows = list.map((c) => ({
        "Customer Name": c.customerName,
        Phone: c.phone,
        "Outstanding Balance (PKR)": fromPaisa(c.outstandingBalance),
      }));
    } else if (type === "supplier-outstanding") {
      const list = await getSupplierOutstandingBalances();
      rows = list.map((s) => ({
        "Supplier Name": s.supplierName,
        Phone: s.phone,
        "Payable Balance (PKR)": fromPaisa(s.outstandingBalance),
      }));
    } else if (type === "top-selling") {
      const list = await getTopSellingProducts(dateFrom, dateTo);
      rows = list.map((t) => ({
        "Variant SKU": t.variantSku,
        "Product Name": t.productName,
        Size: t.size,
        Color: t.color,
        "Units Sold": t.totalQty,
        "Revenue (PKR)": fromPaisa(t.totalRevenue),
      }));
    } else {
      return notFoundResponse(`Report '${type}'`);
    }

    const csvString = Papa.unparse(rows);

    return new NextResponse(csvString, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}-report.csv"`,
      },
    });
  }
);
