import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { successResponse, notFoundResponse , isValidId} from "@/lib/api-response";
import { supplierUpdateSchema } from "@/utils/zod-schemas";
import {
  getSupplierById,
  updateSupplier,
  softDeleteSupplier,
  getSupplierBalance,
} from "@/services/supplier.service";
import { getLedgerEntries } from "@/services/ledger.service";

export const GET = withApiHandler(
  async (_req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!isValidId(id)) return notFoundResponse("Supplier");

    const supplier = await getSupplierById(id);
    if (!supplier) return notFoundResponse("Supplier");

    const balancePaisa = await getSupplierBalance(id);
    const ledger = await getLedgerEntries({
      party: id,
      partyType: "supplier",
      limit: 20,
    });

    return successResponse({
      ...supplier,
      outstandingBalance: balancePaisa,
      recentLedger: ledger.entries,
    });
  }
);

export const PUT = withApiHandler(
  async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!isValidId(id)) return notFoundResponse("Supplier");

    const body = await req.json();
    const validated = supplierUpdateSchema.parse(body);
    const updated = await updateSupplier(id, validated);
    return successResponse(updated);
  }
);

export const DELETE = withApiHandler(
  async (_req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!isValidId(id)) return notFoundResponse("Supplier");

    const deleted = await softDeleteSupplier(id);
    return successResponse(deleted);
  }
);
