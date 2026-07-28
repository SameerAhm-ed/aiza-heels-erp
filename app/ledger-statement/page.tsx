"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatPaisaAsPKR } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import { LedgerEntry, Customer, Supplier } from "@/types";
import { Printer } from "lucide-react";

function StatementContent() {
  const searchParams = useSearchParams();
  const partyType = (searchParams.get("partyType") || "customer") as "customer" | "supplier";
  const partyId = searchParams.get("party") || "";
  const autoprint = searchParams.get("autoprint") === "1";

  const [party, setParty] = useState<Customer | Supplier | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!partyId) {
        setIsLoading(false);
        return;
      }
      try {
        const [partyRes, ledgerRes] = await Promise.all([
          fetch(`/api/${partyType === "customer" ? "customers" : "suppliers"}/${partyId}`),
          fetch(`/api/ledger?partyType=${partyType}&party=${partyId}&limit=1000`),
        ]);
        const partyJson = await partyRes.json();
        const ledgerJson = await ledgerRes.json();
        if (partyJson.success) setParty(partyJson.data);
        if (ledgerJson.success) setEntries(ledgerJson.data);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [partyType, partyId]);

  useEffect(() => {
    if (autoprint && !isLoading && party) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [autoprint, isLoading, party]);

  const closingBalance = entries[0]?.runningBalance ?? 0;
  const openingBalance = entries[entries.length - 1]?.runningBalance ?? 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-200 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading statement…</p>
      </div>
    );
  }

  if (!party) {
    return (
      <div className="min-h-screen bg-slate-200 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-sm text-destructive">Account not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 dark:bg-slate-950 py-10 print:bg-white print:py-0">
      <div className="no-print sticky top-0 z-10 flex justify-center pb-4">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>

      {/* "Paper" sheet — Letter-width preview, full-bleed on actual print */}
      <div className="mx-auto max-w-[816px] bg-white text-black shadow-xl rounded-sm p-4 sm:p-8 md:p-12 space-y-6 print:shadow-none print:rounded-none print:max-w-none print:p-0 print:mx-0">
        <div className="space-y-1 pb-4 border-b border-black/10">
          <h1 className="text-xl font-bold">Aiza Heels</h1>
          <p className="text-sm font-semibold">
            {partyType === "customer" ? "Customer" : "Supplier"} Account Statement
          </p>
          <p className="text-sm">{party.name}</p>
          <p className="text-xs text-black/60">{party.phone}</p>
          <p className="text-xs text-black/60">Generated: {formatDate(new Date())}</p>
          <div className="flex gap-6 text-xs font-mono pt-1">
            <span>Opening Balance: {formatPaisaAsPKR(openingBalance)}</span>
            <span className="font-bold">Closing Balance: {formatPaisaAsPKR(closingBalance)}</span>
          </div>
        </div>

        <div className="overflow-x-auto print:overflow-visible -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[640px] sm:min-w-0 text-sm font-mono">
            <thead className="bg-black/5 text-xs font-semibold text-black/60 border-b border-black/10">
              <tr>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left font-sans">Reference Type</th>
                <th className="p-2 text-left font-sans">Details / Notes</th>
                <th className="p-2 text-left font-sans">Products &amp; Qty</th>
                <th className="p-2 text-right">Debit (₨)</th>
                <th className="p-2 text-right">Credit (₨)</th>
                <th className="p-2 text-right">Running Balance (₨)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-black/50 font-sans">
                    No ledger entries found for this account.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry._id.toString()}>
                    <td className="p-2 text-black/60">{formatDate(entry.date)}</td>
                    <td className="p-2 font-sans text-xs capitalize">{entry.referenceType}</td>
                    <td className="p-2 font-sans text-xs">{entry.notes || "—"}</td>
                    <td className="p-2 font-sans text-xs">
                      {entry.items && entry.items.length > 0 ? (
                        <ul className="space-y-0.5">
                          {entry.items.map((item, i) => (
                            <li key={i}>
                              {item.productName}{" "}
                              <span className="text-black/50">
                                ({item.variantSku}) × {item.qty}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-black/40">—</span>
                      )}
                    </td>
                    <td className="p-2 text-right text-red-600">
                      {entry.debit > 0 ? formatPaisaAsPKR(entry.debit) : "—"}
                    </td>
                    <td className="p-2 text-right text-emerald-600">
                      {entry.credit > 0 ? formatPaisaAsPKR(entry.credit) : "—"}
                    </td>
                    <td className="p-2 text-right font-bold">
                      {formatPaisaAsPKR(entry.runningBalance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          @page {
            margin: 12mm;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function LedgerStatementPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <StatementContent />
    </Suspense>
  );
}
