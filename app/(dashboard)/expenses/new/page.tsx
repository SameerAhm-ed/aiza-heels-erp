"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { ExpenseCategory } from "@/types";
import { toKarachiDateString } from "@/lib/dates";
import { ArrowLeft, Receipt, Upload, FileText } from "lucide-react";
import Link from "next/link";

export default function NewExpensePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    categoryId: "",
    description: "",
    amount: "",
    date: toKarachiDateString(new Date()),
    paymentMethod: "cash" as "cash" | "bank",
    attachmentPath: "",
  });

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/expense-categories");
        const json = await res.json();
        if (json.success) {
          setCategories(json.data);
          if (json.data.length > 0) {
            setFormData((prev) => ({ ...prev, categoryId: json.data[0]._id }));
          }
        }
      } catch {
        toast.error("Failed to load expense categories");
      }
    }
    loadCategories();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);

      const res = await fetch("/api/uploads", {
        method: "POST",
        body: data,
      });

      const json = await res.json();
      if (json.success) {
        setFormData((prev) => ({ ...prev, attachmentPath: json.data.url }));
        toast.success("Receipt image uploaded!");
      } else {
        toast.error(json.error || "Upload failed");
      }
    } catch {
      toast.error("Error uploading receipt");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId || !formData.description || !formData.amount) {
      return toast.error("Category, description, and amount are required");
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: Number(formData.amount),
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Expense recorded & ledger updated!");
        router.push("/expenses");
      } else {
        toast.error(json.error || "Failed to record expense");
      }
    } catch {
      toast.error("Error recording expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1">
          <Link href="/expenses">
            <ArrowLeft className="h-4 w-4" />
            <span>Expenses</span>
          </Link>
        </Button>
        <span>/</span>
        <span className="text-foreground font-medium">Record Expense</span>
      </div>

      <PageHeader
        title="Record Business Expense"
        description="Select expense category, record payment method, and upload receipt proof."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Expense Entry Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="category">Expense Category *</Label>
                <Link
                  href="/categories"
                  className="text-xs text-primary hover:underline"
                  target="_blank"
                >
                  + Manage Categories
                </Link>
              </div>
              <Select
                value={formData.categoryId}
                onValueChange={(val) =>
                  setFormData({ ...formData, categoryId: val ?? "" })
                }
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c._id.toString()} value={c._id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description / Purpose *</Label>
              <Textarea
                id="description"
                required
                placeholder="e.g. Factory electricity bill July 2026, Transport for sole delivery..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Expense Amount (PKR ₨) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  className="font-mono"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Expense Date *</Label>
                <Input
                  id="date"
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Source / Method *</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(val) =>
                  setFormData({ ...formData, paymentMethod: (val as "cash" | "bank") ?? "cash" })
                }
              >
                <SelectTrigger id="paymentMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash in Hand</SelectItem>
                  <SelectItem value="bank">Bank Account</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* File Upload */}
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="receipt">Attach Receipt Image (Optional)</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="text-xs"
                />
                {formData.attachmentPath && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                    <FileText className="h-4 w-4" />
                    <span>Uploaded</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Saved locally to /public/uploads directory.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild disabled={isSubmitting}>
            <Link href="/expenses">Cancel</Link>
          </Button>
          <Button type="submit" size="lg" disabled={isSubmitting} className="gap-2">
            <Receipt className="h-4 w-4" />
            <span>{isSubmitting ? "Recording..." : "Save Expense"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
