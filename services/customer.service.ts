import { db } from "@/lib/db";
import { customers, sales, ledgerEntries } from "@/lib/schema";
import { and, count, desc, eq, like, or, asc, sql } from "drizzle-orm";
import { toPaisa } from "@/lib/currency";
import { businessError } from "@/lib/error-handler";
import { createLedgerEntry } from "./ledger.service";
import {
  CustomerCreateInput,
  CustomerUpdateInput,
} from "@/utils/zod-schemas";

function withId<T extends { id: number }>(row: T) {
  return { ...row, _id: String(row.id) };
}

export async function createCustomer(input: CustomerCreateInput) {
  const openingBalancePaisa = toPaisa(input.openingBalance ?? 0);

  const customer = await db.transaction(async (tx) => {
    const [customer] = await tx
      .insert(customers)
      .values({
        ...input,
        openingBalance: openingBalancePaisa,
      })
      .returning();

    // Post the opening balance to the customer ledger so outstanding-balance
    // calculations (which read only the ledger) reflect it from day one.
    if (openingBalancePaisa !== 0) {
      await createLedgerEntry({
        date: new Date(),
        referenceType: "opening_balance",
        referenceId: customer.id,
        debit: openingBalancePaisa > 0 ? openingBalancePaisa : 0,
        credit: openingBalancePaisa < 0 ? -openingBalancePaisa : 0,
        party: customer.id,
        partyType: "customer",
        notes: "Opening balance",
        tx,
      });
    }

    return customer;
  });

  return withId(customer);
}

export async function updateCustomer(id: string, input: CustomerUpdateInput) {
  const update: Record<string, unknown> = { ...input };
  if (input.openingBalance !== undefined) {
    update.openingBalance = toPaisa(input.openingBalance);
  }
  update.updatedAt = new Date();

  const [customer] = await db
    .update(customers)
    .set(update)
    .where(eq(customers.id, Number(id)))
    .returning();

  if (!customer) businessError("Customer not found");
  return withId(customer);
}

export async function softDeleteCustomer(id: string) {
  const customerId = Number(id);
  // Guard: check if this customer has any existing sales
  const [{ value: salesCount }] = await db
    .select({ value: count() })
    .from(sales)
    .where(eq(sales.customerId, customerId));

  // Either way (has transactions or not) — soft delete only, matching prior behavior.
  void salesCount;

  const [customer] = await db
    .update(customers)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(customers.id, customerId))
    .returning();

  return customer ? withId(customer) : null;
}

export async function listCustomers(params: {
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
  if (!includeInactive) conditions.push(eq(customers.isActive, true));
  if (search) {
    conditions.push(
      or(like(customers.name, `%${search}%`), like(customers.phone, `%${search}%`))
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const sortColumn =
    (customers as unknown as Record<string, any>)[sortBy] ?? customers.createdAt;
  const orderFn = sortOrder === "asc" ? asc : desc;

  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(customers)
      .where(where)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ value: count() }).from(customers).where(where),
  ]);

  return { customers: rows.map(withId), total, page, limit };
}

export async function getCustomerById(id: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, Number(id)));
  return customer ? withId(customer) : null;
}

/** Get customer's outstanding balance from ledger */
export async function getCustomerBalance(customerId: string): Promise<number> {
  const [lastEntry] = await db
    .select({ runningBalance: ledgerEntries.runningBalance })
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.party, Number(customerId)),
        eq(ledgerEntries.partyType, "customer")
      )
    )
    .orderBy(desc(ledgerEntries.createdAt))
    .limit(1);
  // runningBalance: positive = customer owes us
  return lastEntry?.runningBalance ?? 0;
}

/** Aggregate outstanding balances for all customers (for reports) */
export async function getCustomerOutstandingBalances() {
  // Latest ledger entry per customer party (by createdAt), then join to customers, filter > 0.
  const latestPerParty = db
    .select({
      party: ledgerEntries.party,
      runningBalance: ledgerEntries.runningBalance,
      rn: sql<number>`row_number() over (partition by ${ledgerEntries.party} order by ${ledgerEntries.createdAt} desc)`.as(
        "rn"
      ),
    })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.partyType, "customer"))
    .as("latest");

  const rows = await db
    .select({
      customerId: customers.id,
      customerName: customers.name,
      phone: customers.phone,
      outstandingBalance: latestPerParty.runningBalance,
    })
    .from(latestPerParty)
    .innerJoin(customers, eq(customers.id, latestPerParty.party))
    .where(and(eq(latestPerParty.rn, 1), sql`${latestPerParty.runningBalance} > 0`))
    .orderBy(desc(latestPerParty.runningBalance));

  return rows.map((r) => ({
    ...r,
    customerId: String(r.customerId),
  }));
}
