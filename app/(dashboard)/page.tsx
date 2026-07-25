"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPaisaAsPKR } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import { DashboardStats } from "@/types";
import {
  TrendingUp,
  CreditCard,
  Wallet,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  ShoppingBag,
  Receipt,
  Plus,
  BarChart3,
  PieChart as PieIcon,
  LineChart as LineIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

const CHART_COLORS = [
  "oklch(0.52 0.13 180)", // Teal
  "oklch(0.62 0.15 70)",  // Amber
  "oklch(0.67 0.13 150)", // Emerald
  "oklch(0.72 0.12 210)", // Sky
  "oklch(0.57 0.23 27)",  // Rose
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartType, setChartType] = useState<"bar" | "line">("line");

  useEffect(() => {
    async function loadStats() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/dashboard");
        const json = await res.json();
        if (json.success) {
          setStats(json.data);
        } else {
          toast.error(json.error || "Failed to load dashboard metrics");
        }
      } catch {
        toast.error("Error loading dashboard data");
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Overview"
        description="Real-time KPI metrics, inventory alerts, sales trends, and cash flow summary."
      >
        <div className="flex items-center gap-2">
          <Button size="sm" asChild className="gap-1.5 shadow-sm">
            <Link href="/sales/new">
              <Plus className="h-4 w-4" />
              <span>New Invoice</span>
            </Link>
          </Button>
        </div>
      </PageHeader>

      {/* 6 Top KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Today's Sales */}
        <Card className="stat-teal text-white shadow-md">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider opacity-90">
              Today's Sales
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            {isLoading ? (
              <Skeleton className="h-7 w-24 bg-white/20" />
            ) : (
              <div className="text-xl font-bold font-mono">
                {formatPaisaAsPKR(stats?.todaySales ?? 0)}
              </div>
            )}
            <p className="text-[10px] opacity-80 mt-1">Invoiced today</p>
          </CardContent>
        </Card>

        {/* Today's Expenses */}
        <Card className="stat-amber text-white shadow-md">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider opacity-90">
              Today's Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            {isLoading ? (
              <Skeleton className="h-7 w-24 bg-white/20" />
            ) : (
              <div className="text-xl font-bold font-mono">
                {formatPaisaAsPKR(stats?.todayExpenses ?? 0)}
              </div>
            )}
            <p className="text-[10px] opacity-80 mt-1">Operational payout</p>
          </CardContent>
        </Card>

        {/* Cash in Hand */}
        <Card className="stat-green text-white shadow-md">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider opacity-90">
              Cash in Hand
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            {isLoading ? (
              <Skeleton className="h-7 w-24 bg-white/20" />
            ) : (
              <div className="text-xl font-bold font-mono">
                {formatPaisaAsPKR(stats?.cashInHand ?? 0)}
              </div>
            )}
            <p className="text-[10px] opacity-80 mt-1">Liquid cash balance</p>
          </CardContent>
        </Card>

        {/* Outstanding Receivables */}
        <Card className="stat-red text-white shadow-md">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider opacity-90">
              Receivables
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            {isLoading ? (
              <Skeleton className="h-7 w-24 bg-white/20" />
            ) : (
              <div className="text-xl font-bold font-mono">
                {formatPaisaAsPKR(stats?.outstandingReceivables ?? 0)}
              </div>
            )}
            <p className="text-[10px] opacity-80 mt-1">Customer dues</p>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card className="border bg-card shadow-sm">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-xl font-bold font-mono text-primary">
                {formatPaisaAsPKR(stats?.monthlyRevenue ?? 0)}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">This calendar month</p>
          </CardContent>
        </Card>

        {/* Monthly Expenses */}
        <Card className="border bg-card shadow-sm">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Monthly Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
                {formatPaisaAsPKR(stats?.monthlyExpenses ?? 0)}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">This calendar month</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">
              Sales Revenue Trend (Last 30 Days)
            </CardTitle>
            <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
              <Button
                variant={chartType === "line" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setChartType("line")}
                title="Line chart"
              >
                <LineIcon className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={chartType === "bar" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setChartType("bar")}
                title="Bar chart"
              >
                <BarChart3 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="h-72 pt-4">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : stats?.salesLast30Days.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No sales data recorded in the last 30 days.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "line" ? (
                  <LineChart data={stats?.salesLast30Days}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(val) => `₨${val / 100000}k`}
                    />
                    <Tooltip
                      formatter={(val: any) => [
                        formatPaisaAsPKR(val),
                        "Revenue",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="oklch(0.52 0.13 180)"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={stats?.salesLast30Days}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(val) => `₨${val / 100000}k`}
                    />
                    <Tooltip
                      formatter={(val: any) => [
                        formatPaisaAsPKR(val),
                        "Revenue",
                      ]}
                    />
                    <Bar
                      dataKey="total"
                      fill="oklch(0.52 0.13 180)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Expenses by Category Pie Chart (1 col) */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Monthly Expenses by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72 flex flex-col justify-center items-center">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : stats?.expensesByCategory.length === 0 ? (
              <div className="text-muted-foreground text-xs text-center">
                No expense data for this month.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.expensesByCategory}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {stats?.expensesByCategory.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [
                      formatPaisaAsPKR(val),
                      "Expense",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Low Stock Alerts & Unified Recent Transactions Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alerts Widget (1 col) */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-base font-semibold">
                Low Stock Alerts ({stats?.lowStockProducts.length ?? 0})
              </CardTitle>
            </div>
            <Button size="sm" variant="ghost" asChild className="text-xs">
              <Link href="/products?lowStock=true">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))
            ) : stats?.lowStockProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                All inventory stock levels are healthy!
              </p>
            ) : (
              stats?.lowStockProducts.slice(0, 4).map((p) => (
                <div
                  key={p.variantSku}
                  className="flex items-center justify-between p-2.5 rounded-lg border bg-amber-500/10 border-amber-500/20 text-xs"
                >
                  <div>
                    <p className="font-semibold text-foreground">{p.productName}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      SKU: {p.variantSku} ({p.size}/{p.color})
                    </p>
                  </div>
                  <Badge variant="destructive" className="font-mono text-xs">
                    {p.currentStock} remaining
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Unified Recent Transactions Feed (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">
              Recent Activity & Transaction Log
            </CardTitle>
            <span className="text-xs text-muted-foreground">Last 10 transactions</span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b">
                  <tr>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-left">Description</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-right">Amount (₨)</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={4} className="p-3">
                          <Skeleton className="h-5 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : stats?.recentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        No recent transactions recorded.
                      </td>
                    </tr>
                  ) : (
                    stats?.recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-muted/20">
                        <td className="p-3 capitalize">
                          <Badge
                            variant={
                              tx.type === "sale"
                                ? "default"
                                : tx.type === "purchase"
                                ? "outline"
                                : "destructive"
                            }
                            className="text-[10px]"
                          >
                            {tx.type}
                          </Badge>
                        </td>
                        <td className="p-3 font-medium">{tx.description}</td>
                        <td className="p-3 text-muted-foreground">
                          {formatDate(tx.date)}
                        </td>
                        <td
                          className={`p-3 text-right font-mono font-bold ${
                            tx.type === "sale"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {tx.type === "sale" ? "+" : "-"} {formatPaisaAsPKR(tx.amount)}
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
    </div>
  );
}
