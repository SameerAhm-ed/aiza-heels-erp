"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Expense } from "@/types";
import { formatPaisaAsPKR } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import { Plus, Receipt, FileText, ExternalLink } from "lucide-react";
import Link from "next/link";

interface ExpenseWithCategory extends Omit<Expense, "categoryId"> {
  categoryId?: { _id?: string; name?: string };
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [isLoading, setIsLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      const res = await fetch(`/api/expenses?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setExpenses(json.data);
        setTotal(json.pagination.total);
      } else {
        toast.error(json.error || "Failed to load expenses");
      }
    } catch {
      toast.error("Network error loading expenses");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const columns: Column<ExpenseWithCategory>[] = [
    {
      header: "Category",
      cell: (row) => (
        <Badge variant="outline" className="font-medium text-xs">
          {row.categoryId?.name || "General"}
        </Badge>
      ),
    },
    {
      header: "Description",
      accessorKey: "description",
      cell: (row) => (
        <span className="font-semibold text-xs">{row.description}</span>
      ),
    },
    {
      header: "Date",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.date)}
        </span>
      ),
    },
    {
      header: "Payment Method",
      cell: (row) => (
        <span className="uppercase text-xs font-mono text-muted-foreground">
          {row.paymentMethod}
        </span>
      ),
    },
    {
      header: "Amount",
      cell: (row) => (
        <span className="font-mono font-bold text-xs text-destructive">
          {formatPaisaAsPKR(row.amount)}
        </span>
      ),
    },
    {
      header: "Receipt Attachment",
      cell: (row) =>
        row.attachmentPath ? (
          <a
            href={row.attachmentPath}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>View Receipt</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">None</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Tracking"
        description="View and record factory, salary, utility, transport, and miscellaneous business expenses."
      >
        <Button asChild className="gap-2">
          <Link href="/expenses/new">
            <Plus className="h-4 w-4" />
            <span>Record Expense</span>
          </Link>
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={expenses}
        total={total}
        page={page}
        limit={limit}
        isLoading={isLoading}
        onPageChange={setPage}
        onLimitChange={setLimit}
        emptyMessage="No expenses recorded yet."
      />
    </div>
  );
}
