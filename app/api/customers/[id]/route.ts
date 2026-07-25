import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { successResponse, notFoundResponse } from "@/lib/api-response";
import { customerUpdateSchema } from "@/utils/zod-schemas";
import {
  getCustomerById,
  updateCustomer,
  softDeleteCustomer,
  getCustomerBalance,
} from "@/services/customer.service";
import { getLedgerEntries } from "@/services/ledger.service";

export const GET = withApiHandler(
  async (_req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!id) return notFoundResponse("Customer");

    const customer = await getCustomerById(id);
    if (!customer) return notFoundResponse("Customer");

    const balancePaisa = await getCustomerBalance(id);
    const ledger = await getLedgerEntries({
      party: id,
      partyType: "customer",
      limit: 20,
    });

    return successResponse({
      ...customer,
      outstandingBalance: balancePaisa,
      recentLedger: ledger.entries,
    });
  }
);

export const PUT = withApiHandler(
  async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!id) return notFoundResponse("Customer");

    const body = await req.json();
    const validated = customerUpdateSchema.parse(body);
    const updated = await updateCustomer(id, validated);
    return successResponse(updated);
  }
);

export const DELETE = withApiHandler(
  async (_req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!id) return notFoundResponse("Customer");

    const deleted = await softDeleteCustomer(id);
    return successResponse(deleted);
  }
);
