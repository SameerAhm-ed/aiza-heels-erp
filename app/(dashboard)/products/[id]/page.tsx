"use client";

import { use, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPaisaAsPKR } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import { Product, StockMovement } from "@/types";
import { ArrowLeft, History, PackageCheck, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductDetailData extends Omit<Product, "category"> {
  category?: { name: string };
  movements: StockMovement[];
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [productData, setProductData] = useState<ProductDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/products/${id}`);
        const json = await res.json();
        if (json.success) {
          setProductData(json.data);
        } else {
          toast.error(json.error || "Product not found");
        }
      } catch {
        toast.error("Failed to load product details");
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
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Product not found.</p>
        <Button asChild className="mt-4">
          <Link href="/products">Back to Inventory</Link>
        </Button>
      </div>
    );
  }

  const { movements = [] } = productData;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1">
          <Link href="/products">
            <ArrowLeft className="h-4 w-4" />
            <span>Products</span>
          </Link>
        </Button>
        <span>/</span>
        <span className="text-foreground font-medium">{productData.name}</span>
      </div>

      <PageHeader
        title={productData.name}
        description={`Category: ${productData.category?.name || "General"} • Model: ${productData.model || "N/A"} • Material: ${productData.material || "N/A"}`}
      />

      {/* Variants & Pricing Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {productData.variants.map((v) => {
          const isLow = v.currentStock <= productData.minStockAlert;
          return (
            <Card key={v.sku} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-sm font-semibold font-mono">
                      {v.sku}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Size: {v.size} • Color: {v.color}
                    </p>
                  </div>
                  <Badge variant={isLow ? "destructive" : "secondary"}>
                    {v.currentStock} {productData.unit}s
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Cost Price (COGS):</span>
                  <span>{formatPaisaAsPKR(v.purchasePrice)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Selling Price:</span>
                  <span className="font-bold text-primary">
                    {formatPaisaAsPKR(v.sellingPrice)}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Immutable Stock Movement Audit Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">
              Stock Movement Audit History Log
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {movements.length} Movements Recorded
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b">
                <tr>
                  <th className="p-3 text-left">Date & Time</th>
                  <th className="p-3 text-left">Variant SKU</th>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-right">Change (Delta)</th>
                  <th className="p-3 text-right">Resulting Balance</th>
                  <th className="p-3 text-left font-sans">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground font-sans">
                      No stock movement history recorded for this product yet.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m._id.toString()} className="hover:bg-muted/30">
                      <td className="p-3 text-muted-foreground">
                        {formatDate(m.createdAt)}
                      </td>
                      <td className="p-3 font-semibold">{m.variantSku}</td>
                      <td className="p-3 capitalize font-sans text-xs">
                        <Badge
                          variant={
                            m.type === "purchase"
                              ? "default"
                              : m.type === "sale"
                              ? "destructive"
                              : "outline"
                          }
                          className="capitalize text-[10px]"
                        >
                          {m.type}
                        </Badge>
                      </td>
                      <td
                        className={`p-3 text-right font-bold ${
                          m.delta > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive"
                        }`}
                      >
                        {m.delta > 0 ? `+${m.delta}` : m.delta}
                      </td>
                      <td className="p-3 text-right font-bold">
                        {m.resultingBalance}
                      </td>
                      <td className="p-3 font-sans text-xs text-muted-foreground">
                        {m.reason || "Automatic transaction entry"}
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
