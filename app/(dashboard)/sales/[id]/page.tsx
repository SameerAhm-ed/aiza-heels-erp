"use client";

import { use, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPaisaAsPKR, fromPaisa } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import { Sale, Customer } from "@/types";
import {
  Printer,
  Download,
  MessageSquare,
  DollarSign,
  ArrowLeft,
  Footprints,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface SaleDetailData extends Omit<Sale, "customerId"> {
  customerId: Customer;
}

export default function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [sale, setSale] = useState<SaleDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Payment modal state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank">("cash");
  const [isRecording, setIsRecording] = useState(false);

  const fetchSale = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sales/${id}`);
      const json = await res.json();
      if (json.success) {
        setSale(json.data);
        if (json.data.remainingAmount > 0) {
          setPaymentAmount(fromPaisa(json.data.remainingAmount));
        }
      } else {
        toast.error(json.error || "Sale not found");
      }
    } catch {
      toast.error("Failed to load invoice");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSale();
  }, [id]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale) return;
    if (paymentAmount <= 0) return toast.error("Payment amount must be greater than 0");

    setIsRecording(true);
    try {
      const res = await fetch(`/api/sales/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: paymentAmount,
          paymentMethod,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Payment recorded & ledger accounts updated!");
        setIsPaymentOpen(false);
        fetchSale();
      } else {
        toast.error(json.error || "Failed to record payment");
      }
    } catch {
      toast.error("Error recording payment");
    } finally {
      setIsRecording(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Invoice not found.</p>
        <Button asChild className="mt-4">
          <Link href="/sales">Back to Invoices</Link>
        </Button>
      </div>
    );
  }

  const customer = sale.customerId;
  const whatsapp = customer?.whatsappNumber || customer?.phone || "";

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1">
            <Link href="/sales">
              <ArrowLeft className="h-4 w-4" />
              <span>Sales Invoices</span>
            </Link>
          </Button>
          <span>/</span>
          <span className="text-foreground font-mono font-medium">
            {sale.invoiceNumber}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {sale.remainingAmount > 0 && (
            <Button
              onClick={() => setIsPaymentOpen(true)}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <DollarSign className="h-4 w-4" />
              <span>Record Payment</span>
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => window.print()}
            className="gap-1.5"
          >
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </Button>

          <Button variant="outline" asChild className="gap-1.5">
            <a href={`/api/sales/${sale._id}/pdf`} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" />
              <span>PDF</span>
            </a>
          </Button>

          {whatsapp && (
            <Button variant="outline" asChild className="gap-1.5 border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950">
              <a
                href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                  `Invoice ${sale.invoiceNumber} for PKR ${formatPaisaAsPKR(sale.grandTotal)}. Thank you!`
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageSquare className="h-4 w-4" />
                <span>WhatsApp</span>
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Printable Invoice Container */}
      <div className="print-invoice bg-card border rounded-lg p-8 shadow-sm space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-6 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
              <Footprints className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary tracking-tight">
                HeelCraft ERP
              </h1>
              <p className="text-xs text-muted-foreground">
                Women's Heel Manufacturing & Wholesale
              </p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold font-mono tracking-tight text-primary">
              TAX INVOICE
            </h2>
            <p className="text-sm font-mono font-semibold mt-1">{sale.invoiceNumber}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Date: {formatDate(sale.createdAt)}
            </p>
          </div>
        </div>

        {/* Billed To & Status */}
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Billed To:
            </p>
            <p className="font-bold text-base">{customer?.name || "Customer"}</p>
            <p className="text-muted-foreground font-mono text-xs mt-1">
              Phone: {customer?.phone}
            </p>
            {customer?.address && (
              <p className="text-muted-foreground text-xs mt-0.5">
                Address: {customer.address}
              </p>
            )}
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Invoice Status:
            </p>
            <div>
              <Badge
                variant={
                  sale.status === "paid"
                    ? "default"
                    : sale.status === "partial"
                    ? "outline"
                    : "destructive"
                }
                className="capitalize text-xs font-semibold"
              >
                {sale.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Payment Method: <span className="uppercase font-semibold">{sale.paymentMethod}</span>
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b">
              <tr>
                <th className="p-3 text-left">Product</th>
                <th className="p-3 text-left font-mono">SKU / Variant</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Unit Price</th>
                <th className="p-3 text-right">Discount</th>
                <th className="p-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sale.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-muted/20">
                  <td className="p-3 font-semibold">{item.productName}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">
                    {item.variantSku} ({item.size} / {item.color})
                  </td>
                  <td className="p-3 text-right font-mono">{item.qty}</td>
                  <td className="p-3 text-right font-mono">
                    {formatPaisaAsPKR(item.unitPrice)}
                  </td>
                  <td className="p-3 text-right font-mono text-muted-foreground">
                    {item.discount > 0 ? formatPaisaAsPKR(item.discount) : "—"}
                  </td>
                  <td className="p-3 text-right font-mono font-bold">
                    {formatPaisaAsPKR(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Totals */}
        <div className="flex justify-end">
          <div className="w-72 space-y-2 text-sm font-mono">
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground font-sans">Subtotal:</span>
              <span>{formatPaisaAsPKR(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground font-sans">Discount:</span>
                <span>- {formatPaisaAsPKR(sale.discount)}</span>
              </div>
            )}
            {sale.tax > 0 && (
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground font-sans">Tax:</span>
                <span>+ {formatPaisaAsPKR(sale.tax)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b-2 border-primary font-bold text-base text-primary">
              <span className="font-sans">Grand Total:</span>
              <span>{formatPaisaAsPKR(sale.grandTotal)}</span>
            </div>
            <div className="flex justify-between py-1 text-emerald-600 dark:text-emerald-400">
              <span className="font-sans">Paid Amount:</span>
              <span>{formatPaisaAsPKR(sale.paidAmount)}</span>
            </div>
            <div className="flex justify-between py-1 font-bold text-destructive">
              <span className="font-sans">Remaining:</span>
              <span>{formatPaisaAsPKR(sale.remainingAmount)}</span>
            </div>
          </div>
        </div>

        {sale.notes && (
          <div className="pt-4 border-t text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">Notes & Terms:</p>
            <p>{sale.notes}</p>
          </div>
        )}
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment for {sale.invoiceNumber}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-md text-xs space-y-1">
              <p>
                <strong>Grand Total:</strong> {formatPaisaAsPKR(sale.grandTotal)}
              </p>
              <p>
                <strong>Current Remaining:</strong>{" "}
                <span className="text-destructive font-bold">
                  {formatPaisaAsPKR(sale.remainingAmount)}
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payAmount">Payment Amount (PKR ₨) *</Label>
              <Input
                id="payAmount"
                type="number"
                step="0.01"
                min="0.01"
                max={fromPaisa(sale.remainingAmount)}
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payMethod">Payment Method *</Label>
              <Select
                value={paymentMethod}
                onValueChange={(val) => setPaymentMethod((val as "cash" | "bank") ?? "cash")}
              >
                <SelectTrigger id="payMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash in Hand</SelectItem>
                  <SelectItem value="bank">Bank Account</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPaymentOpen(false)}
                disabled={isRecording}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isRecording}>
                {isRecording ? "Processing..." : "Save Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
