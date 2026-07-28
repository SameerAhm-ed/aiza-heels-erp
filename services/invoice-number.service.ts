/**
 * Atomic invoice number generation.
 * Uses a SQLite upsert (`onConflictDoUpdate`) on the invoice_counters table,
 * always executed inside the caller's Drizzle transaction (tx), guaranteeing
 * no duplicate invoice numbers even under concurrent requests.
 *
 * Format: INV-{YEAR}-{SEQUENCE padded to 4 digits}
 * Example: INV-2026-0001
 */
import { db } from "@/lib/db";
import { invoiceCounters } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function generateInvoiceNumber(tx: Tx): Promise<string> {
  const year = new Date().getFullYear().toString();

  // Atomically increment the counter for this year (upsert: create with sequence 1
  // if it doesn't exist yet, otherwise increment).
  await tx
    .insert(invoiceCounters)
    .values({ id: year, sequence: 1 })
    .onConflictDoUpdate({
      target: invoiceCounters.id,
      set: { sequence: sql`${invoiceCounters.sequence} + 1` },
    });

  const [counter] = await tx
    .select()
    .from(invoiceCounters)
    .where(eq(invoiceCounters.id, year));

  const paddedSequence = String(counter.sequence).padStart(4, "0");
  return `INV-${year}-${paddedSequence}`;
}
