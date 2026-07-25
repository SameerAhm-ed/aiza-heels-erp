"use client";

import { use, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPaisaAsPKR } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import { Supplier, LedgerEntry, Purchase } from "@/types";
import { Phone, MapPin, ArrowLeft, ShoppingBag, BookOpen } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function SupplierProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [supplierData, setSupplierData] = useState<{
    supplier: Supplier;
    outstandingBalance: number;
    recentLedger: LedgerEntry[];
  } | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [sRes, pRes] = await Promise.all([
          fetch(`/api/suppliers/${id}`),
          fetch(`/api/purchases?supplierId=${id}&limit=50`),
        ]);

        const sJson = await sRes.json();
        const pJson = await pRes.json();

        if (sJson.success) {
          setSupplierData({
            supplier: sJson.data,
            outstandingBalance: sJson.data.outstandingBalance || 0,
            recentLedger: sJson.data.recentLedger || [],
          });
        } else {
          toast.error(sJson.error || "Supplier not found");
        }

        if (pJson.success) {
          setPurchases(pJson.data);
        }
      } catch {
        toast.error("Failed to load supplier profile");
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

  if (!supplierData) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Supplier profile not found.</p>
        <Button asChild className="mt-4">
          <Link href="/suppliers">Back to Suppliers</Link>
        </Button>
      </div>
    );
  }

  const { supplier, outstandingBalance, recentLedger } = supplierData;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1">
          <Link href="/suppliers">
            <ArrowLeft className="h-4 w-4" />
            <span>Suppliers</span>
          </Link>
        </Button>
        <span>/</span>
        <span className="text-foreground font-medium">{supplier.name}</span>
      </div>

      <PageHeader
        title={supplier.name}
        description={`Supplier Account Profile & Ledger`}
      >
        <Button asChild className="gap-2">
          <Link href={`/purchases/new?supplierId=${supplier._id}`}>
            <ShoppingBag className="h-4 w-4" />
            <span>Record Purchase</span>
          </Link>
        </Button>
      </PageHeader>

      {/* Info & Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Supplier Contact Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              <span className="font-mono text-foreground">{supplier.phone}</span>
            </div>
            {supplier.address && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="text-foreground">{supplier.address}</span>
              </div>
            )}
            {supplier.notes && (
              <div className="pt-2 border-t text-xs text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">Notes:</p>
                <p>{supplier.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Outstanding Payable Balance
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
                  ? "Payable (We Owe Supplier)"
                  : outstandingBalance < 0
                  ? "Prepaid / Credit"
                  : "Clear"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Opening Balance: {formatPaisaAsPKR(supplier.openingBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="purchases" className="space-y-4">
        <TabsList>
          <TabsTrigger value="purchases" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            <span>Purchase History ({purchases.length})</span>
          </TabsTrigger>
          <TabsTrigger value="ledger" className="gap-2">
            <BookOpen className="h-4 w-4" />
            <span>Supplier Ledger</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b">
                    <tr>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-right">Grand Total</th>
                      <th className="p-3 text-right">Paid</th>
                      <th className="p-3 text-right">Remaining</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {purchases.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No purchases recorded from this supplier.
                        </td>
                      </tr>
                    ) : (
                      purchases.map((purchase) => (
                        <tr key={purchase._id.toString()} className="hover:bg-muted/30">
                          <td className="p-3 text-muted-foreground">
                            {formatDate(purchase.createdAt)}
                          </td>
                          <td className="p-3 text-right font-mono">
                            {formatPaisaAsPKR(purchase.grandTotal)}
                          </td>
                          <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            {formatPaisaAsPKR(purchase.paidAmount)}
                          </td>
                          <td className="p-3 text-right font-mono text-destructive">
                            {formatPaisaAsPKR(purchase.remainingAmount)}
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              variant={
                                purchase.status === "paid"
                                  ? "default"
                                  : purchase.status === "partial"
                                  ? "outline"
                                  : "destructive"
                              }
                              className="capitalize text-xs"
                            >
                              {purchase.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <Button size="sm" variant="ghost" asChild>
                              <Link href={`/purchases/${purchase._id}`}>View</Link>
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
                      <th className="p-3 text-right">Debit (Paid) ₨</th>
                      <th className="p-3 text-right">Credit (Bought) ₨</th>
                      <th className="p-3 text-right">Balance ₨</th>
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
                          <td className="p-3 text-right text-emerald-600 dark:text-emerald-400">
                            {entry.debit > 0 ? formatPaisaAsPKR(entry.debit) : "—"}
                          </td>
                          <td className="p-3 text-right text-destructive">
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
