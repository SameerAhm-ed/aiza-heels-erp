"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPaisaAsPKR } from "@/lib/currency";
import { toKarachiDateString, getKarachiMonthStart, formatDate } from "@/lib/dates";
import {
  BarChart3,
  Download,
  Printer,
  DollarSign,
  TrendingUp,
  Receipt,
  Users,
  Building2,
  Package,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState("sales");
  const [dateFrom, setDateFrom] = useState(
    toKarachiDateString(getKarachiMonthStart())
  );
  const [dateTo, setDateTo] = useState(toKarachiDateString(new Date()));

  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ dateFrom, dateTo });
      const res = await fetch(`/api/reports/${activeReport}?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setReportData(json.data);
      } else {
        toast.error(json.error || "Failed to generate report");
      }
    } catch {
      toast.error("Error loading report");
    } finally {
      setIsLoading(false);
    }
  }, [activeReport, dateFrom, dateTo]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const csvDownloadUrl = `/api/reports/${activeReport}/csv?dateFrom=${dateFrom}&dateTo=${dateTo}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics Center"
        description="Comprehensive audit-ready financial, sales, inventory valuation, and profitability reports."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </Button>

          <Button size="sm" asChild className="gap-1.5">
            <a href={csvDownloadUrl} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </a>
          </Button>
        </div>
      </PageHeader>

      {/* Date Range Selector Bar */}
      <div className="flex flex-col sm:flex-row items-end gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="space-y-1">
          <Label className="text-xs">Start Date</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">End Date</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 text-xs"
          />
        </div>
      </div>

      {/* Report Tabs */}
      <Tabs
        value={activeReport}
        onValueChange={(val) => setActiveReport((val as any) ?? "sales")}
        className="space-y-6"
      >
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/40 p-1">
          <TabsTrigger value="sales" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Sales Report</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-1.5 text-xs">
            <Receipt className="h-3.5 w-3.5" />
            <span>Expense Report</span>
          </TabsTrigger>
          <TabsTrigger value="profit" className="gap-1.5 text-xs">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Profit & Loss</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1.5 text-xs">
            <Package className="h-3.5 w-3.5" />
            <span>Inventory Valuation</span>
          </TabsTrigger>
          <TabsTrigger value="customer-outstanding" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" />
            <span>Customer Outstanding</span>
          </TabsTrigger>
          <TabsTrigger value="supplier-outstanding" className="gap-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5" />
            <span>Supplier Payables</span>
          </TabsTrigger>
          <TabsTrigger value="top-selling" className="gap-1.5 text-xs">
            <Award className="h-3.5 w-3.5" />
            <span>Top Products</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. Sales Report Tab */}
        <TabsContent value="sales" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs text-muted-foreground uppercase">
                  Total Period Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-primary">
                  {formatPaisaAsPKR(reportData?.totalRevenue ?? 0)}
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs text-muted-foreground uppercase">
                  Collected Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {formatPaisaAsPKR(reportData?.totalPaid ?? 0)}
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-rose-500">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs text-muted-foreground uppercase">
                  Uncollected Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                  {formatPaisaAsPKR(reportData?.totalRemaining ?? 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b">
                    <tr>
                      <th className="p-3 text-left">Invoice #</th>
                      <th className="p-3 text-left">Customer</th>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-right">Grand Total</th>
                      <th className="p-3 text-right">Paid</th>
                      <th className="p-3 text-right">Remaining</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={7} className="p-3">
                            <Skeleton className="h-5 w-full" />
                          </td>
                        </tr>
                      ))
                    ) : reportData?.sales?.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          No sales recorded in this date range.
                        </td>
                      </tr>
                    ) : (
                      reportData?.sales?.map((s: any) => (
                        <tr key={s._id} className="hover:bg-muted/30">
                          <td className="p-3 font-mono font-bold text-primary">
                            {s.invoiceNumber}
                          </td>
                          <td className="p-3 font-medium">{s.customerId?.name}</td>
                          <td className="p-3 text-muted-foreground">
                            {formatDate(s.createdAt)}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold">
                            {formatPaisaAsPKR(s.grandTotal)}
                          </td>
                          <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            {formatPaisaAsPKR(s.paidAmount)}
                          </td>
                          <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400">
                            {formatPaisaAsPKR(s.remainingAmount)}
                          </td>
                          <td className="p-3 text-center capitalize text-xs">
                            {s.status}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Profit & Loss Report Tab */}
        <TabsContent value="profit" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-3 bg-card border">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Profit & Loss Statement ({dateFrom} to {dateTo})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 font-mono text-sm max-w-xl">
                <div className="flex justify-between py-2 border-b">
                  <span className="font-sans font-medium text-muted-foreground">
                    (+) Total Sales Revenue:
                  </span>
                  <span className="font-bold text-primary">
                    {formatPaisaAsPKR(reportData?.revenue ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="font-sans font-medium text-muted-foreground">
                    (-) Cost of Goods Sold (COGS):
                  </span>
                  <span className="text-rose-600 dark:text-rose-400">
                    - {formatPaisaAsPKR(reportData?.cogs ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b font-bold bg-muted/30 px-3 rounded">
                  <span className="font-sans">(=) Gross Operating Profit:</span>
                  <span>{formatPaisaAsPKR(reportData?.grossProfit ?? 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="font-sans font-medium text-muted-foreground">
                    (-) Operating & Factory Expenses:
                  </span>
                  <span className="text-rose-600 dark:text-rose-400">
                    - {formatPaisaAsPKR(reportData?.expenses ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between py-3 border-b-2 border-primary font-bold text-lg text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 rounded">
                  <span className="font-sans">(=) Net Profit / Loss:</span>
                  <span>{formatPaisaAsPKR(reportData?.netProfit ?? 0)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 3. Inventory Valuation Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs text-muted-foreground uppercase">
                  Total Finished Heel Inventory Count
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">
                  {reportData?.totalStockCount ?? 0} pairs
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs text-muted-foreground uppercase">
                  Total Asset Inventory Valuation (at Purchase Cost)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {formatPaisaAsPKR(reportData?.totalValuation ?? 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b">
                    <tr>
                      <th className="p-3 text-left">Product Name</th>
                      <th className="p-3 text-left">Category</th>
                      <th className="p-3 text-right">Available Stock</th>
                      <th className="p-3 text-right font-mono">Asset Valuation</th>
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
                    ) : (
                      reportData?.items?.map((item: any) => (
                        <tr key={item.productId} className="hover:bg-muted/30">
                          <td className="p-3 font-semibold">{item.name}</td>
                          <td className="p-3 text-muted-foreground text-xs">
                            {item.categoryName}
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            {item.stockCount} pairs
                          </td>
                          <td className="p-3 text-right font-mono text-primary font-bold">
                            {formatPaisaAsPKR(item.valuationPaisa)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Top Selling Products Tab */}
        <TabsContent value="top-selling" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Top Selling Heel Variants (Ranked by Sales Volume)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b">
                    <tr>
                      <th className="p-3 text-left">Rank</th>
                      <th className="p-3 text-left font-mono">Variant SKU</th>
                      <th className="p-3 text-left">Size / Color</th>
                      <th className="p-3 text-right">Units Sold</th>
                      <th className="p-3 text-right font-mono">Total Revenue Generated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={5} className="p-3">
                            <Skeleton className="h-5 w-full" />
                          </td>
                        </tr>
                      ))
                    ) : !Array.isArray(reportData) || reportData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No sales data for top products in this date range.
                        </td>
                      </tr>
                    ) : (
                      reportData.map((item: any, idx: number) => (
                        <tr key={item.variantSku} className="hover:bg-muted/30">
                          <td className="p-3 font-bold text-muted-foreground">
                            #{idx + 1}
                          </td>
                          <td className="p-3 font-mono font-bold text-primary">
                            {item.variantSku}
                          </td>
                          <td className="p-3 text-xs">
                            {item.size} / {item.color}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {item.totalQty} pairs
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            {formatPaisaAsPKR(item.totalRevenue)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
