"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Sale } from "@/types";
import { formatPaisaAsPKR } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import { Plus, Eye, FileText, Download, Printer } from "lucide-react";
import Link from "next/link";

interface SaleWithCustomer extends Omit<Sale, "customerId"> {
  customerId?: { _id?: string; name?: string; phone?: string };
}

export default function SalesPage() {
  const [sales, setSales] = useState<SaleWithCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  const fetchSales = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/sales?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setSales(json.data);
        setTotal(json.pagination.total);
      } else {
        toast.error(json.error || "Failed to load sales invoices");
      }
    } catch {
      toast.error("Network error loading sales");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, statusFilter]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const columns: Column<SaleWithCustomer>[] = [
    {
      header: "Invoice #",
      accessorKey: "invoiceNumber",
      cell: (row) => (
        <Link
          href={`/sales/${row._id}`}
          className="font-mono font-bold text-primary hover:underline"
        >
          {row.invoiceNumber}
        </Link>
      ),
    },
    {
      header: "Customer",
      cell: (row) => (
        <div>
          <p className="font-semibold text-xs">{row.customerId?.name || "Customer"}</p>
          <p className="text-[11px] text-muted-foreground font-mono">
            {row.customerId?.phone}
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
      header: "Paid",
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
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="View Invoice">
            <Link href={`/sales/${row._id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" asChild title="Download PDF">
            <a href={`/api/sales/${row._id}/pdf`} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" />
            </a>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Invoices"
        description="Create, view, and track sales invoices and customer payments."
      >
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? "all")}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>

          <Button asChild className="gap-2">
            <Link href="/sales/new">
              <Plus className="h-4 w-4" />
              <span>Create Invoice</span>
            </Link>
          </Button>
        </div>
      </PageHeader>

      <DataTable
        columns={columns}
        data={sales}
        total={total}
        page={page}
        limit={limit}
        isLoading={isLoading}
        search={search}
        onSearchChange={setSearch}
        onPageChange={setPage}
        onLimitChange={setLimit}
        searchPlaceholder="Search by invoice number..."
        emptyMessage="No sales invoices found matching filters."
      />
    </div>
  );
}
