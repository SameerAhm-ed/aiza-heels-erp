import { NextRequest, NextResponse } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { notFoundResponse , isValidId} from "@/lib/api-response";
import { getSaleById } from "@/services/sale.service";
import { getCustomerById } from "@/services/customer.service";
import { generateInvoicePdfBuffer } from "@/lib/pdf";

export const GET = withApiHandler(
  async (_req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!isValidId(id)) return notFoundResponse("Sale");

    const sale = await getSaleById(id);
    if (!sale) return notFoundResponse("Sale");

    const customerId = (sale.customerId as { _id?: string })?._id || String(sale.customerId);
    const customer = await getCustomerById(customerId);
    if (!customer) return notFoundResponse("Customer");

    // Generate PDF Buffer
    const pdfBuffer = await generateInvoicePdfBuffer(
      sale as any,
      customer as any
    );

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${sale.invoiceNumber}.pdf"`,
      },
    });
  }
);
