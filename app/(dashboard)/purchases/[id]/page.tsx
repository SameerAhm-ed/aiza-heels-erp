"use client";

import { use, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPaisaAsPKR } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import { Purchase, Supplier } from "@/types";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface PurchaseDetailData extends Omit<Purchase, "supplierId"> {
  supplierId: Supplier;
}

export default function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [purchase, setPurchase] = useState<PurchaseDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPurchase() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/purchases/${id}`);
        const json = await res.json();
        if (json.success) {
          setPurchase(json.data);
        } else {
          toast.error(json.error || "Purchase record not found");
        }
      } catch {
        toast.error("Failed to load purchase record");
      } finally {
        setIsLoading(false);
      }
    }
    loadPurchase();
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground font-medium">Purchase record not found.</p>
        <Button asChild className="mt-4">
          <Link href="/purchases">Back to Purchases</Link>
        </Button>
      </div>
    );
  }

  const supplier = purchase.supplierId;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1">
          <Link href="/purchases">
            <ArrowLeft className="h-4 w-4" />
            <span>Purchases</span>
          </Link>
        </Button>
        <span>/</span>
        <span className="text-foreground font-medium font-mono">
          {formatDate(purchase.createdAt)}
        </span>
      </div>

      <PageHeader
        title="Purchase Order Record"
        description={`Supplier: ${supplier?.name || "Supplier"} • Phone: ${supplier?.phone || "N/A"}`}
      />

      <div className="bg-card border rounded-lg p-8 shadow-sm space-y-6">
        <div className="flex justify-between items-start border-b pb-4">
          <div>
            <h2 className="text-lg font-bold text-primary">PURCHASE VOUCHER</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Date: {formatDate(purchase.createdAt)}
            </p>
          </div>
          <div className="text-right space-y-1">
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
            <p className="text-xs text-muted-foreground">
              Method: <span className="uppercase font-semibold">{purchase.paymentMethod}</span>
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b">
              <tr>
                <th className="p-3 text-left">Product</th>
                <th className="p-3 text-left font-mono">Variant SKU</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Unit Cost</th>
                <th className="p-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {purchase.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-muted/20">
                  <td className="p-3 font-semibold">{item.productName}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">
                    {item.variantSku}
                  </td>
                  <td className="p-3 text-right font-mono">{item.qty}</td>
                  <td className="p-3 text-right font-mono">
                    {formatPaisaAsPKR(item.unitCost)}
                  </td>
                  <td className="p-3 text-right font-mono font-bold">
                    {formatPaisaAsPKR(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72 space-y-2 text-sm font-mono">
            <div className="flex justify-between py-2 border-b-2 border-primary font-bold text-base text-primary">
              <span className="font-sans">Grand Total:</span>
              <span>{formatPaisaAsPKR(purchase.grandTotal)}</span>
            </div>
            <div className="flex justify-between py-1 text-emerald-600 dark:text-emerald-400">
              <span className="font-sans">Paid Amount:</span>
              <span>{formatPaisaAsPKR(purchase.paidAmount)}</span>
            </div>
            <div className="flex justify-between py-1 font-bold text-destructive">
              <span className="font-sans">Remaining Payable:</span>
              <span>{formatPaisaAsPKR(purchase.remainingAmount)}</span>
            </div>
          </div>
        </div>

        {purchase.notes && (
          <div className="pt-4 border-t text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">Notes:</p>
            <p>{purchase.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
