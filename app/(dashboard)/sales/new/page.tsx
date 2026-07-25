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
import { Customer, Product, ProductVariant } from "@/types";
import { formatPKR, fromPaisa } from "@/lib/currency";
import { Plus, Trash2, ArrowLeft, ShoppingCart, AlertCircle } from "lucide-react";
import Link from "next/link";

interface LineItem {
  productId: string;
  variantSku: string;
  qty: number;
  unitPrice: number; // rupees
  discount: number; // rupees per line
}

function NewSalePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get("customerId");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId || "");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank">("cash");
  const [invoiceDiscount, setInvoiceDiscount] = useState<number>(0);
  const [invoiceTax, setInvoiceTax] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [items, setItems] = useState<LineItem[]>([
    { productId: "", variantSku: "", qty: 1, unitPrice: 0, discount: 0 },
  ]);

  useEffect(() => {
    async function loadData() {
      try {
        const [cRes, pRes] = await Promise.all([
          fetch("/api/customers?limit=100"),
          fetch("/api/products?limit=100"),
        ]);
        const cJson = await cRes.json();
        const pJson = await pRes.json();

        if (cJson.success) {
          setCustomers(cJson.data);
          if (!selectedCustomerId && cJson.data.length > 0) {
            setSelectedCustomerId(cJson.data[0]._id);
          }
        }
        if (pJson.success) {
          setProducts(pJson.data);
        }
      } catch {
        toast.error("Failed to load customer or product data");
      }
    }
    loadData();
  }, [selectedCustomerId]);

  const handleAddLineItem = () => {
    setItems([
      ...items,
      { productId: "", variantSku: "", qty: 1, unitPrice: 0, discount: 0 },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (items.length === 1) return toast.error("Invoice must have at least one line item");
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
      unitPrice: fromPaisa(firstVariant.sellingPrice),
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
      unitPrice: fromPaisa(variant.sellingPrice),
    };
    setItems(updated);
  };

  const handleItemChange = (
    index: number,
    field: keyof LineItem,
    value: number
  ) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const lineTotal = (item.unitPrice - item.discount) * item.qty;
      return sum + Math.max(0, lineTotal);
    }, 0);
  }, [items]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - invoiceDiscount + invoiceTax);
  }, [subtotal, invoiceDiscount, invoiceTax]);

  const remainingAmount = useMemo(() => {
    return Math.max(0, grandTotal - paidAmount);
  }, [grandTotal, paidAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return toast.error("Please select a customer");

    // Validate line items
    for (let i = 0; i < items.length; i++) {
      if (!items[i].productId || !items[i].variantSku) {
        return toast.error(`Line item #${i + 1} has an unselected product/variant`);
      }
      if (items[i].qty < 1) {
        return toast.error(`Line item #${i + 1} quantity must be at least 1`);
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          items,
          discount: invoiceDiscount,
          tax: invoiceTax,
          paidAmount,
          paymentMethod,
          notes,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Invoice ${json.data.invoiceNumber} created successfully!`);
        router.push(`/sales/${json.data._id}`);
      } else {
        toast.error(json.error || "Failed to create invoice");
      }
    } catch {
      toast.error("Error creating sales invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1">
          <Link href="/sales">
            <ArrowLeft className="h-4 w-4" />
            <span>Sales Invoices</span>
          </Link>
        </Button>
        <span>/</span>
        <span className="text-foreground font-medium">Create Invoice</span>
      </div>

      <PageHeader
        title="Create New Sales Invoice"
        description="Select customer, add heel product variants, configure discounts, and process payment."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Payment Setup Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Invoice Header
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="customer">Customer *</Label>
                <Link
                  href="/customers"
                  className="text-xs text-primary hover:underline"
                  target="_blank"
                >
                  + Add New Customer
                </Link>
              </div>
              <Select
                value={selectedCustomerId}
                onValueChange={(val) => setSelectedCustomerId(val ?? "")}
              >
                <SelectTrigger id="customer">
                  <SelectValue placeholder="Select Customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c._id.toString()} value={c._id.toString()}>
                      {c.name} ({c.phone})
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

        {/* Multi-Line Items Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Invoice Line Items
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLineItem}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Add Line Item</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, idx) => {
              const selectedProduct = products.find(
                (p) => p._id.toString() === item.productId
              );
              const selectedVariant = selectedProduct?.variants.find(
                (v) => v.sku === item.variantSku
              );
              const availableStock = selectedVariant?.currentStock ?? 0;
              const isStockShort = availableStock < item.qty;
              const lineTotal = (item.unitPrice - item.discount) * item.qty;

              return (
                <div
                  key={idx}
                  className="p-4 border rounded-lg bg-muted/20 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
                >
                  {/* Product Select */}
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

                  {/* Variant Select */}
                  <div className="space-y-1 md:col-span-3">
                    <Label className="text-xs">Variant (SKU/Size/Color) *</Label>
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
                            {v.sku} ({v.size}/{v.color}) — Stock: {v.currentStock}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Qty */}
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

                  {/* Unit Price */}
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs">Unit Price (₨)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-9 text-xs font-mono"
                      value={item.unitPrice}
                      onChange={(e) =>
                        handleItemChange(idx, "unitPrice", Number(e.target.value))
                      }
                    />
                  </div>

                  {/* Line Total */}
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

                  {/* Stock Warning */}
                  {item.productId && isStockShort && (
                    <div className="md:col-span-12 flex items-center gap-1.5 text-xs text-destructive font-semibold">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>
                        Insufficient stock! Available: {availableStock}, Requested: {item.qty}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Totals & Payment Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Special delivery instructions, customer notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Invoice Calculation Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b text-muted-foreground">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatPKR(subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-1">
                <Label htmlFor="invDiscount" className="text-xs">
                  Invoice Discount (₨):
                </Label>
                <Input
                  id="invDiscount"
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-32 h-8 text-xs text-right font-mono"
                  value={invoiceDiscount}
                  onChange={(e) => setInvoiceDiscount(Number(e.target.value))}
                />
              </div>

              <div className="flex items-center justify-between gap-4 py-1 border-b pb-2">
                <Label htmlFor="invTax" className="text-xs">
                  Tax / GST (₨):
                </Label>
                <Input
                  id="invTax"
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-32 h-8 text-xs text-right font-mono"
                  value={invoiceTax}
                  onChange={(e) => setInvoiceTax(Number(e.target.value))}
                />
              </div>

              <div className="flex justify-between py-2 border-b text-base font-bold text-primary">
                <span>Grand Total:</span>
                <span className="font-mono">{formatPKR(grandTotal)}</span>
              </div>

              <div className="flex items-center justify-between gap-4 py-1">
                <Label htmlFor="paidAmount" className="text-xs font-semibold">
                  Paid Amount Now (₨):
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
                <span>Remaining Balance:</span>
                <span className="font-mono">{formatPKR(remainingAmount)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild disabled={isSubmitting}>
            <Link href="/sales">Cancel</Link>
          </Button>
          <Button type="submit" size="lg" disabled={isSubmitting} className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span>{isSubmitting ? "Creating Invoice..." : "Finalize & Save Invoice"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewSalePage() {
  return (
    <Suspense>
      <NewSalePageInner />
    </Suspense>
  );
}
