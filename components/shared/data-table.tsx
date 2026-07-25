"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpDown,
  Inbox,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface Column<T> {
  header: string;
  accessorKey?: keyof T | string;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  limit: number;
  isLoading?: boolean;
  search?: string;
  onSearchChange?: (val: string) => void;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  onSort?: (field: string) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  actionButton?: React.ReactNode;
}

export function DataTable<T extends { _id?: string | object; id?: string }>({
  columns,
  data,
  total,
  page,
  limit,
  isLoading = false,
  search,
  onSearchChange,
  onPageChange,
  onLimitChange,
  onSort,
  searchPlaceholder = "Search records...",
  emptyMessage = "No records found.",
  actionButton,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      {(onSearchChange || actionButton) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {onSearchChange && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={search ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 bg-card"
              />
            </div>
          )}
          {actionButton && <div className="flex items-center gap-2">{actionButton}</div>}
        </div>
      )}

      {/* Table Container */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <Table className="responsive-table sticky-header">
            <TableHeader className="bg-muted/50">
              <TableRow>
                {columns.map((col, idx) => (
                  <TableHead
                    key={idx}
                    className={col.className}
                  >
                    {col.sortable && onSort && col.accessorKey ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 text-xs font-semibold"
                        onClick={() => onSort(String(col.accessorKey))}
                      >
                        <span>{col.header}</span>
                        <ArrowUpDown className="ml-1.5 h-3 w-3" />
                      </Button>
                    ) : (
                      <span className="text-xs font-semibold">{col.header}</span>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, rIdx) => (
                  <TableRow key={rIdx}>
                    {columns.map((_, cIdx) => (
                      <TableCell key={cIdx}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-48 text-center"
                  >
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <Inbox className="h-10 w-10 text-muted-foreground/50 stroke-1" />
                      <p className="text-sm font-medium">{emptyMessage}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, rIdx) => {
                  const key = String(row._id || row.id || rIdx);
                  return (
                    <TableRow key={key} className="hover:bg-muted/40 transition-colors">
                      {columns.map((col, cIdx) => (
                        <TableCell
                          key={cIdx}
                          data-label={col.header}
                          className={col.className}
                        >
                          {col.cell
                            ? col.cell(row)
                            : col.accessorKey
                            ? String(
                                (row as Record<string, unknown>)[
                                  String(col.accessorKey)
                                ] ?? ""
                              )
                            : null}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            {onLimitChange && (
              <Select
                value={String(limit)}
                onValueChange={(val) => onLimitChange(Number(val))}
              >
                <SelectTrigger className="h-8 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            )}
            <span>
              Showing {Math.min((page - 1) * limit + 1, total)} -{" "}
              {Math.min(page * limit, total)} of {total} records
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange?.(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange?.(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
