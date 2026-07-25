import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { paginatedResponse, createdResponse } from "@/lib/api-response";
import { saleCreateSchema } from "@/utils/zod-schemas";
import { createSale, listSales } from "@/services/sale.service";
import { sendInvoicePdf, isWhatsAppConfigured } from "@/lib/whatsapp";
import { getCustomerById } from "@/services/customer.service";

export const GET = withApiHandler(async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 20;
  const search = searchParams.get("search") || undefined;
  const status = searchParams.get("status") || undefined;
  const customerId = searchParams.get("customerId") || undefined;
  const dateFromStr = searchParams.get("dateFrom") || undefined;
  const dateToStr = searchParams.get("dateTo") || undefined;

  const result = await listSales({
    page,
    limit,
    search,
    status,
    customerId,
    dateFrom: dateFromStr ? new Date(dateFromStr) : undefined,
    dateTo: dateToStr ? new Date(dateToStr) : undefined,
  });

  return paginatedResponse(result.sales, page, limit, result.total);
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();
  const validated = saleCreateSchema.parse(body);

  // 1-6. Create sale with atomic multi-document transaction
  const sale = await createSale(validated);

  // 7. Fire-and-forget WhatsApp Cloud API send AFTER commit succeeds
  const saleIdStr = sale._id.toString();
  const pdfUrl = `${req.nextUrl.origin}/api/sales/${saleIdStr}/pdf`;

  if (isWhatsAppConfigured()) {
    getCustomerById(validated.customerId).then((customer) => {
      if (customer) {
        const targetWa = customer.whatsappNumber || customer.phone;
        sendInvoicePdf(targetWa, pdfUrl, sale.invoiceNumber);
      }
    });
  }

  return createdResponse(sale);
});
