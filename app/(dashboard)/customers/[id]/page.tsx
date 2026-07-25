"use client";

import { use, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPaisaAsPKR } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import { Customer, LedgerEntry, Sale } from "@/types";
import { MessageSquare, Phone, MapPin, ArrowLeft, ShoppingCart, BookOpen } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [customerData, setCustomerData] = useState<{
    customer: Customer;
    outstandingBalance: number;
    recentLedger: LedgerEntry[];
  } | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [cRes, sRes] = await Promise.all([
          fetch(`/api/customers/${id}`),
          fetch(`/api/sales?customerId=${id}&limit=50`),
        ]);

        const cJson = await cRes.json();
        const sJson = await sRes.json();

        if (cJson.success) {
          setCustomerData({
            customer: cJson.data,
            outstandingBalance: cJson.data.outstandingBalance || 0,
            recentLedger: cJson.data.recentLedger || [],
          });
        } else {
          toast.error(cJson.error || "Customer not found");
        }

        if (sJson.success) {
          setSales(sJson.data);
        }
      } catch {
        toast.error("Failed to load customer profile");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-40 col-span-1" />
          <Skeleton className="h-40 col-span-2" />
        </div>
      </div>
    );
  }

  if (!customerData) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Customer profile not found.</p>
        <Button asChild className="mt-4">
          <Link href="/customers">Back to Customers</Link>
        </Button>
      </div>
    );
  }

  const { customer, outstandingBalance, recentLedger } = customerData;
  const whatsapp = customer.whatsappNumber || customer.phone;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1">
          <Link href="/customers">
            <ArrowLeft className="h-4 w-4" />
            <span>Customers</span>
          </Link>
        </Button>
        <span>/</span>
        <span className="text-foreground font-medium">{customer.name}</span>
      </div>

      <PageHeader
        title={customer.name}
        description={`Customer Account Profile & Transaction Ledger`}
      >
        <Button asChild className="gap-2">
          <Link href={`/sales/new?customerId=${customer._id}`}>
            <ShoppingCart className="h-4 w-4" />
            <span>Create Invoice</span>
          </Link>
        </Button>
      </PageHeader>

      {/* Info & Balance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Info Card */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Contact Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              <span className="font-mono text-foreground">{customer.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageSquare className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <a
                href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                {whatsapp} (WhatsApp)
              </a>
            </div>
            {customer.address && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="text-foreground">{customer.address}</span>
              </div>
            )}
            {customer.notes && (
              <div className="pt-2 border-t text-xs text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">Notes:</p>
                <p>{customer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Balance Card */}
        <Card className="md:col-span-2 flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Outstanding Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold tracking-tight font-mono">
                {formatPaisaAsPKR(outstandingBalance)}
              </span>
              <Badge
                variant={outstandingBalance > 0 ? "destructive" : "secondary"}
                className="text-xs"
              >
                {outstandingBalance > 0
                  ? "Receivable (Owes Us)"
                  : outstandingBalance < 0
                  ? "Advance / Credit"
                  : "Clear"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Opening Balance: {formatPaisaAsPKR(customer.openingBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Sales History & Ledger */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span>Sales Invoices ({sales.length})</span>
          </TabsTrigger>
          <TabsTrigger value="ledger" className="gap-2">
            <BookOpen className="h-4 w-4" />
            <span>Full Customer Ledger</span>
          </TabsTrigger>
        </TabsList>

        {/* Sales Invoices Tab */}
        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b">
                    <tr>
                      <th className="p-3 text-left">Invoice #</th>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-right">Grand Total</th>
                      <th className="p-3 text-right">Paid</th>
                      <th className="p-3 text-right">Remaining</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sales.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          No sales invoices recorded for this customer.
                        </td>
                      </tr>
                    ) : (
                      sales.map((sale) => (
                        <tr key={sale._id.toString()} className="hover:bg-muted/30">
                          <td className="p-3 font-mono font-medium">
                            <Link
                              href={`/sales/${sale._id}`}
                              className="text-primary hover:underline"
                            >
                              {sale.invoiceNumber}
                            </Link>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {formatDate(sale.createdAt)}
                          </td>
                          <td className="p-3 text-right font-mono">
                            {formatPaisaAsPKR(sale.grandTotal)}
                          </td>
                          <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            {formatPaisaAsPKR(sale.paidAmount)}
                          </td>
                          <td className="p-3 text-right font-mono text-destructive">
                            {formatPaisaAsPKR(sale.remainingAmount)}
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              variant={
                                sale.status === "paid"
                                  ? "default"
                                  : sale.status === "partial"
                                  ? "outline"
                                  : "destructive"
                              }
                              className="capitalize text-xs"
                            >
                              {sale.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <Button size="sm" variant="ghost" asChild>
                              <Link href={`/sales/${sale._id}`}>View</Link>
                            </Button>
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

        {/* Ledger Tab */}
        <TabsContent value="ledger" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b">
                    <tr>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-left">Type</th>
                      <th className="p-3 text-left">Description</th>
                      <th className="p-3 text-right">Debit (₨)</th>
                      <th className="p-3 text-right">Credit (₨)</th>
                      <th className="p-3 text-right">Running Balance (₨)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentLedger.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No ledger entries found.
                        </td>
                      </tr>
                    ) : (
                      recentLedger.map((entry) => (
                        <tr key={entry._id.toString()} className="hover:bg-muted/30">
                          <td className="p-3 text-muted-foreground">
                            {formatDate(entry.date)}
                          </td>
                          <td className="p-3 capitalize">{entry.referenceType}</td>
                          <td className="p-3 font-sans text-xs">{entry.notes || "—"}</td>
                          <td className="p-3 text-right text-destructive">
                            {entry.debit > 0 ? formatPaisaAsPKR(entry.debit) : "—"}
                          </td>
                          <td className="p-3 text-right text-emerald-600 dark:text-emerald-400">
                            {entry.credit > 0 ? formatPaisaAsPKR(entry.credit) : "—"}
                          </td>
                          <td className="p-3 text-right font-bold">
                            {formatPaisaAsPKR(entry.runningBalance)}
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
