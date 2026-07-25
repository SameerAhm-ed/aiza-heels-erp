"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPaisaAsPKR } from "@/lib/currency";
import { toKarachiDateString, getKarachiMonthStart } from "@/lib/dates";
import { Banknote, ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface CashFlowSummaryData {
  openingBalance: number;
  cashIn: number;
  cashOut: number;
  closingBalance: number;
  dailyBreakdown: Array<{
    date: string;
    cashIn: number;
    cashOut: number;
    net: number;
  }>;
}

export default function CashFlowPage() {
  const [dateFrom, setDateFrom] = useState(
    toKarachiDateString(getKarachiMonthStart())
  );
  const [dateTo, setDateTo] = useState(toKarachiDateString(new Date()));
  const [data, setData] = useState<CashFlowSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCashFlow = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        dateFrom,
        dateTo,
      });
      const res = await fetch(`/api/cashflow?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        toast.error(json.error || "Failed to load cash flow data");
      }
    } catch {
      toast.error("Error loading cash flow summary");
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchCashFlow();
  }, [fetchCashFlow]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash Flow Management"
        description="Monitor liquidity, cash inflows from sales, outflows for expenses/purchases, and net closing balances."
      />

      {/* Date Range Selector */}
      <div className="flex flex-col sm:flex-row items-end gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="space-y-1">
          <Label className="text-xs">From Date</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To Date</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 text-xs"
          />
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Opening Balance */}
        <Card className="border-l-4 border-l-slate-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Opening Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold font-mono">
                {formatPaisaAsPKR(data?.openingBalance ?? 0)}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Carried from prior period
            </p>
          </CardContent>
        </Card>

        {/* Cash In */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Cash In (+ Revenue)
            </CardTitle>
            <ArrowDownRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                + {formatPaisaAsPKR(data?.cashIn ?? 0)}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Sales receipts & customer payments
            </p>
          </CardContent>
        </Card>

        {/* Cash Out */}
        <Card className="border-l-4 border-l-rose-500">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Cash Out (- Expenses)
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                - {formatPaisaAsPKR(data?.cashOut ?? 0)}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Purchases, salaries & factory overhead
            </p>
          </CardContent>
        </Card>

        {/* Net Closing Balance */}
        <Card className="border-l-4 border-l-primary bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-primary uppercase tracking-wider">
              Closing Liquidity Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold font-mono text-primary">
                {formatPaisaAsPKR(data?.closingBalance ?? 0)}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Opening + Inflow - Outflow
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Daily Cash Flow Ledger Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b">
                <tr>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-right">Cash Inflow (₨)</th>
                  <th className="p-3 text-right">Cash Outflow (₨)</th>
                  <th className="p-3 text-right">Net Daily Cash Flow (₨)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={4} className="p-3">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    </tr>
                  ))
                ) : data?.dailyBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground font-sans">
                      No cash transactions recorded during this period.
                    </td>
                  </tr>
                ) : (
                  data?.dailyBreakdown.map((row) => (
                    <tr key={row.date} className="hover:bg-muted/30">
                      <td className="p-3 text-muted-foreground">{row.date}</td>
                      <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                        {row.cashIn > 0 ? `+ ${formatPaisaAsPKR(row.cashIn)}` : "—"}
                      </td>
                      <td className="p-3 text-right text-rose-600 dark:text-rose-400 font-semibold">
                        {row.cashOut > 0 ? `- ${formatPaisaAsPKR(row.cashOut)}` : "—"}
                      </td>
                      <td
                        className={`p-3 text-right font-bold ${
                          row.net >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {formatPaisaAsPKR(row.net)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
