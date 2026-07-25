"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Supplier, Product } from "@/types";
import { formatPKR, fromPaisa } from "@/lib/currency";
import { Plus, Trash2, ArrowLeft, ShoppingBag } from "lucide-react";
import Link from "next/link";

interface PurchaseLineItem {
  productId: string;
  variantSku: string;
  qty: number;
  unitCost: number; // rupees
}

function NewPurchasePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSupplierId = searchParams.get("supplierId");

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState(preselectedSupplierId || "");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank">("cash");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [items, setItems] = useState<PurchaseLineItem[]>([
    { productId: "", variantSku: "", qty: 10, unitCost: 0 },
  ]);

  useEffect(() => {
    async function loadData() {
      try {
        const [sRes, pRes] = await Promise.all([
          fetch("/api/suppliers?limit=100"),
          fetch("/api/products?limit=100"),
        ]);
        const sJson = await sRes.json();
        const pJson = await pRes.json();

        if (sJson.success) {
          setSuppliers(sJson.data);
          if (!selectedSupplierId && sJson.data.length > 0) {
            setSelectedSupplierId(sJson.data[0]._id);
          }
        }
        if (pJson.success) {
          setProducts(pJson.data);
        }
      } catch {
        toast.error("Failed to load supplier or product data");
      }
    }
    loadData();
  }, [selectedSupplierId]);

  const handleAddLineItem = () => {
    setItems([...items, { productId: "", variantSku: "", qty: 10, unitCost: 0 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (items.length === 1) return toast.error("Must have at least one purchase item");
    setItems(items.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find((p) => p._id.toString() === productId);
    if (!product || !product.variants || product.variants.length === 0) return;

    const firstVariant = product.variants[0];
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId,
      variantSku: firstVariant.sku,
      unitCost: fromPaisa(firstVariant.purchasePrice),
    };
    setItems(updated);
  };

  const handleVariantSelect = (index: number, variantSku: string) => {
    const product = products.find((p) => p._id.toString() === items[index].productId);
    if (!product) return;

    const variant = product.variants.find((v) => v.sku === variantSku);
    if (!variant) return;

    const updated = [...items];
    updated[index] = {
      ...updated[index],
      variantSku,
      unitCost: fromPaisa(variant.purchasePrice),
    };
    setItems(updated);
  };

  const handleItemChange = (
    index: number,
    field: keyof PurchaseLineItem,
    value: number
  ) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const grandTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.unitCost * item.qty, 0);
  }, [items]);

  const remainingAmount = useMemo(() => {
    return Math.max(0, grandTotal - paidAmount);
  }, [grandTotal, paidAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) return toast.error("Please select a supplier");

    for (let i = 0; i < items.length; i++) {
      if (!items[i].productId || !items[i].variantSku) {
        return toast.error(`Item #${i + 1} has unselected product/variant`);
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          items,
          paidAmount,
          paymentMethod,
          notes,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Purchase recorded & inventory stock updated!");
        router.push("/purchases");
      } else {
        toast.error(json.error || "Failed to record purchase");
      }
    } catch {
      toast.error("Error recording purchase");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <span className="text-foreground font-medium">Record Purchase</span>
      </div>

      <PageHeader
        title="Record Materials / Product Purchase"
        description="Receive incoming stock from suppliers, update unit costs, and create supplier ledger entries."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Purchase Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="supplier">Supplier *</Label>
              <Select
                value={selectedSupplierId}
                onValueChange={(val) => setSelectedSupplierId(val ?? "")}
              >
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="Select Supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s._id.toString()} value={s._id.toString()}>
                      {s.name} ({s.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(val) => setPaymentMethod((val as "cash" | "bank") ?? "cash")}
              >
                <SelectTrigger id="paymentMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash in Hand</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Line items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Incoming Inventory Items
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLineItem}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Add Item</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, idx) => {
              const selectedProduct = products.find(
                (p) => p._id.toString() === item.productId
              );
              const lineTotal = item.unitCost * item.qty;

              return (
                <div
                  key={idx}
                  className="p-4 border rounded-lg bg-muted/20 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
                >
                  <div className="space-y-1 md:col-span-4">
                    <Label className="text-xs">Product *</Label>
                    <Select
                      value={item.productId}
                      onValueChange={(val) => handleProductSelect(idx, val ?? "")}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p._id.toString()} value={p._id.toString()}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 md:col-span-3">
                    <Label className="text-xs">Variant SKU *</Label>
                    <Select
                      value={item.variantSku}
                      onValueChange={(val) => handleVariantSelect(idx, val ?? "")}
                      disabled={!item.productId}
                    >
                      <SelectTrigger className="h-9 text-xs font-mono">
                        <SelectValue placeholder="Select Variant" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedProduct?.variants.map((v) => (
                          <SelectItem key={v.sku} value={v.sku}>
                            {v.sku} ({v.size}/{v.color})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 md:col-span-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      className="h-9 text-xs font-mono"
                      value={item.qty}
                      onChange={(e) =>
                        handleItemChange(idx, "qty", Number(e.target.value))
                      }
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs">Unit Cost (₨)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-9 text-xs font-mono"
                      value={item.unitCost}
                      onChange={(e) =>
                        handleItemChange(idx, "unitCost", Number(e.target.value))
                      }
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2 flex items-center gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Line Total (₨)</Label>
                      <Input
                        disabled
                        className="h-9 text-xs font-mono font-bold bg-muted"
                        value={lineTotal > 0 ? lineTotal.toFixed(2) : "0.00"}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive shrink-0 mt-5"
                      onClick={() => handleRemoveLineItem(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Calculation Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Bill reference number, batch notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Purchase Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b text-base font-bold text-primary">
                <span>Grand Total:</span>
                <span className="font-mono">{formatPKR(grandTotal)}</span>
              </div>

              <div className="flex items-center justify-between gap-4 py-1">
                <Label htmlFor="paidAmount" className="text-xs font-semibold">
                  Paid Amount (₨):
                </Label>
                <Input
                  id="paidAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-36 h-9 text-xs text-right font-mono font-bold"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                />
              </div>

              <div className="flex justify-between py-1 text-sm font-bold text-destructive">
                <span>Payable Remaining:</span>
                <span className="font-mono">{formatPKR(remainingAmount)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild disabled={isSubmitting}>
            <Link href="/purchases">Cancel</Link>
          </Button>
          <Button type="submit" size="lg" disabled={isSubmitting} className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            <span>{isSubmitting ? "Recording..." : "Finalize & Record Purchase"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewPurchasePage() {
  return (
    <Suspense>
      <NewPurchasePageInner />
    </Suspense>
  );
}
