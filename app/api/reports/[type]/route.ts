import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { successResponse, notFoundResponse } from "@/lib/api-response";
import {
  getSalesReport,
  getExpenseReport,
  getProfitReport,
  getInventoryValuationReport,
  getTopSellingProducts,
} from "@/services/report.service";
import { getCustomerOutstandingBalances } from "@/services/customer.service";
import { getSupplierOutstandingBalances } from "@/services/supplier.service";
import { parseKarachiDate, getKarachiMonthStart, getKarachiDayEnd } from "@/lib/dates";

export const GET = withApiHandler(
  async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { type } = await (context?.params ?? Promise.resolve({ type: "" }));
    const searchParams = req.nextUrl.searchParams;

    const dateFromStr = searchParams.get("dateFrom");
    const dateToStr = searchParams.get("dateTo");

    const now = new Date();
    const dateFrom = dateFromStr ? parseKarachiDate(dateFromStr) : getKarachiMonthStart(now);
    const dateTo = dateToStr ? new Date(`${dateToStr}T23:59:59+05:00`) : getKarachiDayEnd(now);

    switch (type) {
      case "sales": {
        const data = await getSalesReport(dateFrom, dateTo);
        return successResponse(data);
      }
      case "expenses": {
        const categoryId = searchParams.get("categoryId") || undefined;
        const data = await getExpenseReport(dateFrom, dateTo, categoryId);
        return successResponse(data);
      }
      case "profit": {
        const data = await getProfitReport(dateFrom, dateTo);
        return successResponse(data);
      }
      case "inventory": {
        const data = await getInventoryValuationReport();
        return successResponse(data);
      }
      case "customer-outstanding": {
        const data = await getCustomerOutstandingBalances();
        return successResponse(data);
      }
      case "supplier-outstanding": {
        const data = await getSupplierOutstandingBalances();
        return successResponse(data);
      }
      case "top-selling": {
        const data = await getTopSellingProducts(dateFrom, dateTo);
        return successResponse(data);
      }
      default:
        return notFoundResponse(`Report type '${type}'`);
    }
  }
);
