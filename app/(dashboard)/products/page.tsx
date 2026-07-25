"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { toast } from "sonner";
import { Product, ProductVariant } from "@/types";
import { formatPaisaAsPKR } from "@/lib/currency";
import { Plus, Eye, Edit, Trash2, AlertTriangle, ArrowUpDown, PackageCheck } from "lucide-react";
import Link from "next/link";

interface ProductWithCategoryName extends Omit<Product, "category"> {
  category?: { name: string };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithCategoryName[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Manual stock adjustment state
  const [adjustingProduct, setAdjustingProduct] = useState<{
    product: ProductWithCategoryName;
    variant: ProductVariant;
  } | null>(null);
  const [newStockInput, setNewStockInput] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Soft delete state
  const [deletingProduct, setDeletingProduct] = useState<ProductWithCategoryName | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set("search", search);
      if (lowStockOnly) params.set("lowStock", "true");

      const res = await fetch(`/api/products?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setProducts(json.data);
        setTotal(json.pagination.total);
      } else {
        toast.error(json.error || "Failed to load products");
      }
    } catch {
      toast.error("Network error loading products");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, lowStockOnly]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    if (!adjustmentReason) return toast.error("Reason is required for manual stock adjustment");

    setIsAdjusting(true);
    try {
      const res = await fetch(`/api/products/${adjustingProduct.product._id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantSku: adjustingProduct.variant.sku,
          newStock: newStockInput,
          reason: adjustmentReason,
        }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success("Stock adjusted & audit movement recorded!");
        setAdjustingProduct(null);
        fetchProducts();
      } else {
        toast.error(json.error || "Failed to adjust stock");
      }
    } catch {
      toast.error("Error adjusting stock");
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${deletingProduct._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Product deactivated!");
        setDeletingProduct(null);
        fetchProducts();
      } else {
        toast.error(json.error || "Failed to deactivate product");
      }
    } catch {
      toast.error("Error deactivating product");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<ProductWithCategoryName>[] = [
    {
      header: "Product Name & Model",
      accessorKey: "name",
      cell: (row) => (
        <div>
          <Link
            href={`/products/${row._id}`}
            className="font-semibold text-primary hover:underline"
          >
            {row.name}
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            {row.model && <span>Model: {row.model}</span>}
            {row.material && <span>• {row.material}</span>}
            <span>• Category: {row.category?.name || "General"}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Variants & Stock Levels",
      cell: (row) => (
        <div className="space-y-1.5 py-1">
          {row.variants.map((v) => {
            const isLow = v.currentStock <= row.minStockAlert;
            return (
              <div
                key={v.sku}
                className="flex items-center justify-between gap-3 text-xs p-1.5 rounded bg-muted/30 hover:bg-muted/60"
              >
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-semibold">{v.sku}</span>
                  <span className="text-muted-foreground">
                    ({v.size} / {v.color})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-muted-foreground">
                    {formatPaisaAsPKR(v.sellingPrice)}
                  </span>
                  <Badge
                    variant={isLow ? "destructive" : "secondary"}
                    className="font-mono text-[10px] gap-1 cursor-pointer"
                    onClick={() => {
                      setAdjustingProduct({ product: row, variant: v });
                      setNewStockInput(v.currentStock);
                      setAdjustmentReason("");
                    }}
                    title="Click to manually adjust stock"
                  >
                    {isLow && <AlertTriangle className="h-3 w-3" />}
                    <span>{v.currentStock} {row.unit}s</span>
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="View Audit Movement History">
            <Link href={`/products/${row._id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => setDeletingProduct(row)}
            title="Deactivate Product"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory & Product Catalog"
        description="Manage heel products, variants (size/color/SKU), stock levels, and stock movements."
      >
        <div className="flex items-center gap-2">
          <Button
            variant={lowStockOnly ? "destructive" : "outline"}
            size="sm"
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className="gap-1.5"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>{lowStockOnly ? "Showing Low Stock" : "Filter Low Stock"}</span>
          </Button>

          <Button asChild className="gap-2">
            <Link href="/products/new">
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </Link>
          </Button>
        </div>
      </PageHeader>

      <DataTable
        columns={columns}
        data={products}
        total={total}
        page={page}
        limit={limit}
        isLoading={isLoading}
        search={search}
        onSearchChange={setSearch}
        onPageChange={setPage}
        onLimitChange={setLimit}
        searchPlaceholder="Search product by name, model, or variant SKU..."
        emptyMessage="No products found matching filters."
      />

      {/* Manual Stock Adjustment Dialog */}
      <Dialog
        open={!!adjustingProduct}
        onOpenChange={(open) => !open && setAdjustingProduct(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-primary" />
              <span>Manual Stock Adjustment</span>
            </DialogTitle>
          </DialogHeader>
          {adjustingProduct && (
            <form onSubmit={handleAdjustStock} className="space-y-4 py-2">
              <div className="p-3 bg-muted/40 rounded-md text-xs space-y-1">
                <p>
                  <strong>Product:</strong> {adjustingProduct.product.name}
                </p>
                <p>
                  <strong>SKU:</strong> {adjustingProduct.variant.sku} (
                  {adjustingProduct.variant.size} / {adjustingProduct.variant.color})
                </p>
                <p>
                  <strong>Current Stock:</strong>{" "}
                  {adjustingProduct.variant.currentStock}{" "}
                  {adjustingProduct.product.unit}s
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newStock">New Adjusted Stock Quantity *</Label>
                <Input
                  id="newStock"
                  type="number"
                  min="0"
                  required
                  value={newStockInput}
                  onChange={(e) => setNewStockInput(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Adjustment *</Label>
                <Input
                  id="reason"
                  required
                  placeholder="e.g. Damage in warehouse, Physical audit correction..."
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  An immutable stock movement record will be written to the audit log.
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdjustingProduct(null)}
                  disabled={isAdjusting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isAdjusting}>
                  {isAdjusting ? "Updating..." : "Save Stock Level"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!deletingProduct}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
        onConfirm={handleDelete}
        title={`Deactivate "${deletingProduct?.name}"?`}
        description="Product will be deactivated. Historical sales and stock movement logs will be safely kept."
        isDeleting={isDeleting}
      />
    </div>
  );
}
