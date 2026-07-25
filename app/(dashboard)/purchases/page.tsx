"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Purchase } from "@/types";
import { formatPaisaAsPKR } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import { Plus, Eye, ShoppingBag } from "lucide-react";
import Link from "next/link";

interface PurchaseWithSupplier extends Omit<Purchase, "supplierId"> {
  supplierId?: { _id?: string; name?: string; phone?: string };
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseWithSupplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPurchases = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      const res = await fetch(`/api/purchases?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setPurchases(json.data);
        setTotal(json.pagination.total);
      } else {
        toast.error(json.error || "Failed to load purchases");
      }
    } catch {
      toast.error("Network error loading purchases");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const columns: Column<PurchaseWithSupplier>[] = [
    {
      header: "Supplier",
      accessorKey: "supplierId",
      cell: (row) => (
        <div>
          <p className="font-semibold text-xs">{row.supplierId?.name || "Supplier"}</p>
          <p className="text-[11px] text-muted-foreground font-mono">
            {row.supplierId?.phone}
          </p>
        </div>
      ),
    },
    {
      header: "Date",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      header: "Grand Total",
      cell: (row) => (
        <span className="font-mono font-semibold text-xs">
          {formatPaisaAsPKR(row.grandTotal)}
        </span>
      ),
    },
    {
      header: "Paid Amount",
      cell: (row) => (
        <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
          {formatPaisaAsPKR(row.paidAmount)}
        </span>
      ),
    },
    {
      header: "Remaining",
      cell: (row) => (
        <span className="font-mono text-xs text-destructive">
          {formatPaisaAsPKR(row.remainingAmount)}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge
          variant={
            row.status === "paid"
              ? "default"
              : row.status === "partial"
              ? "outline"
              : "destructive"
          }
          className="capitalize text-[10px]"
        >
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="View Details">
          <Link href={`/purchases/${row._id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Management"
        description="Record inventory purchases from suppliers and track payables."
      >
        <Button asChild className="gap-2">
          <Link href="/purchases/new">
            <Plus className="h-4 w-4" />
            <span>Record Purchase</span>
          </Link>
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={purchases}
        total={total}
        page={page}
        limit={limit}
        isLoading={isLoading}
        onPageChange={setPage}
        onLimitChange={setLimit}
        emptyMessage="No purchases recorded yet."
      />
    </div>
  );
}
