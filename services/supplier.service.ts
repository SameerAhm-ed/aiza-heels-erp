import { db } from "@/lib/db";
import { suppliers, ledgerEntries } from "@/lib/schema";
import { and, count, desc, eq, like, or, asc, sql } from "drizzle-orm";
import { toPaisa } from "@/lib/currency";
import { businessError } from "@/lib/error-handler";
import { createLedgerEntry } from "./ledger.service";
import {
  SupplierCreateInput,
  SupplierUpdateInput,
} from "@/utils/zod-schemas";

function withId<T extends { id: number }>(row: T) {
  return { ...row, _id: String(row.id) };
}

export async function createSupplier(input: SupplierCreateInput) {
  const openingBalancePaisa = toPaisa(input.openingBalance ?? 0);

  const supplier = await db.transaction(async (tx) => {
    const [supplier] = await tx
      .insert(suppliers)
      .values({
        ...input,
        openingBalance: openingBalancePaisa,
      })
      .returning();

    // Post the opening balance to the supplier ledger so outstanding-balance
    // calculations (which read only the ledger) reflect it from day one.
    if (openingBalancePaisa !== 0) {
      await createLedgerEntry({
        date: new Date(),
        referenceType: "opening_balance",
        referenceId: supplier.id,
        debit: openingBalancePaisa < 0 ? -openingBalancePaisa : 0,
        credit: openingBalancePaisa > 0 ? openingBalancePaisa : 0,
        party: supplier.id,
        partyType: "supplier",
        notes: "Opening balance",
        tx,
      });
    }

    return supplier;
  });

  return withId(supplier);
}

export async function updateSupplier(id: string, input: SupplierUpdateInput) {
  const update: Record<string, unknown> = { ...input };
  if (input.openingBalance !== undefined) {
    update.openingBalance = toPaisa(input.openingBalance);
  }
  update.updatedAt = new Date();

  const [supplier] = await db
    .update(suppliers)
    .set(update)
    .where(eq(suppliers.id, Number(id)))
    .returning();

  if (!supplier) businessError("Supplier not found");
  return withId(supplier);
}

export async function softDeleteSupplier(id: string) {
  const [supplier] = await db
    .update(suppliers)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(suppliers.id, Number(id)))
    .returning();
  return supplier ? withId(supplier) : null;
}

export async function listSuppliers(params: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  includeInactive?: boolean;
}) {
  const {
    page = 1,
    limit = 20,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
    includeInactive = false,
  } = params;

  const conditions = [];
  if (!includeInactive) conditions.push(eq(suppliers.isActive, true));
  if (search) {
    conditions.push(
      or(like(suppliers.name, `%${search}%`), like(suppliers.phone, `%${search}%`))
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const sortColumn =
    (suppliers as unknown as Record<string, any>)[sortBy] ?? suppliers.createdAt;
  const orderFn = sortOrder === "asc" ? asc : desc;

  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(suppliers)
      .where(where)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ value: count() }).from(suppliers).where(where),
  ]);

  return { suppliers: rows.map(withId), total, page, limit };
}

export async function getSupplierById(id: string) {
  const [supplier] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, Number(id)));
  return supplier ? withId(supplier) : null;
}

export async function getSupplierBalance(supplierId: string): Promise<number> {
  const [lastEntry] = await db
    .select({ runningBalance: ledgerEntries.runningBalance })
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.party, Number(supplierId)),
        eq(ledgerEntries.partyType, "supplier")
      )
    )
    .orderBy(desc(ledgerEntries.createdAt))
    .limit(1);
  // runningBalance: positive = we owe supplier
  return lastEntry?.runningBalance ?? 0;
}

export async function getSupplierOutstandingBalances() {
  const latestPerParty = db
    .select({
      party: ledgerEntries.party,
      runningBalance: ledgerEntries.runningBalance,
      rn: sql<number>`row_number() over (partition by ${ledgerEntries.party} order by ${ledgerEntries.createdAt} desc)`.as(
        "rn"
      ),
    })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.partyType, "supplier"))
    .as("latest");

  const rows = await db
    .select({
      supplierId: suppliers.id,
      supplierName: suppliers.name,
      phone: suppliers.phone,
      outstandingBalance: latestPerParty.runningBalance,
    })
    .from(latestPerParty)
    .innerJoin(suppliers, eq(suppliers.id, latestPerParty.party))
    .where(and(eq(latestPerParty.rn, 1), sql`${latestPerParty.runningBalance} > 0`))
    .orderBy(desc(latestPerParty.runningBalance));

  return rows.map((r) => ({
    ...r,
    supplierId: String(r.supplierId),
  }));
}
