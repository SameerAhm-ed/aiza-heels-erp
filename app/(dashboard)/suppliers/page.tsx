"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { toast } from "sonner";
import { Supplier } from "@/types";
import { formatPaisaAsPKR, fromPaisa } from "@/lib/currency";
import { Plus, Eye, Edit, Trash2 } from "lucide-react";
import Link from "next/link";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Form modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    notes: "",
    openingBalance: 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/suppliers?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setSuppliers(json.data);
        setTotal(json.pagination.total);
      } else {
        toast.error(json.error || "Failed to load suppliers");
      }
    } catch {
      toast.error("Network error loading suppliers");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setFormData({
      name: "",
      phone: "",
      address: "",
      notes: "",
      openingBalance: 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      phone: supplier.phone,
      address: supplier.address || "",
      notes: supplier.notes || "",
      openingBalance: fromPaisa(supplier.openingBalance),
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error("Name and Phone are required");
      return;
    }

    setIsSaving(true);
    try {
      const url = editingSupplier
        ? `/api/suppliers/${editingSupplier._id}`
        : "/api/suppliers";
      const method = editingSupplier ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(
          editingSupplier ? "Supplier updated!" : "Supplier created!"
        );
        setIsModalOpen(false);
        fetchSuppliers();
      } else {
        toast.error(json.error || "Failed to save supplier");
      }
    } catch {
      toast.error("Error saving supplier");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSupplier) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/suppliers/${deletingSupplier._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Supplier deactivated successfully");
        setDeletingSupplier(null);
        fetchSuppliers();
      } else {
        toast.error(json.error || "Failed to deactivate supplier");
      }
    } catch {
      toast.error("Error deactivating supplier");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<Supplier>[] = [
    {
      header: "Supplier Name",
      accessorKey: "name",
      cell: (row) => (
        <div>
          <Link
            href={`/suppliers/${row._id}`}
            className="font-semibold text-primary hover:underline"
          >
            {row.name}
          </Link>
          {row.address && (
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
              {row.address}
            </p>
          )}
        </div>
      ),
    },
    {
      header: "Phone",
      accessorKey: "phone",
      cell: (row) => (
        <span className="font-mono text-xs">{row.phone}</span>
      ),
    },
    {
      header: "Opening Balance",
      cell: (row) => (
        <span className="font-mono text-xs">
          {formatPaisaAsPKR(row.openingBalance)}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            asChild
            title="View Profile & Ledger"
          >
            <Link href={`/suppliers/${row._id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleOpenEdit(row)}
            title="Edit Supplier"
          >
            <Edit className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => setDeletingSupplier(row)}
            title="Deactivate Supplier"
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
        title="Supplier Management"
        description="View, add, search, and manage material suppliers and payment accounts."
      >
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          <span>Add Supplier</span>
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={suppliers}
        total={total}
        page={page}
        limit={limit}
        isLoading={isLoading}
        search={search}
        onSearchChange={setSearch}
        onPageChange={setPage}
        onLimitChange={setLimit}
        searchPlaceholder="Search supplier by name or phone..."
        emptyMessage="No suppliers found. Click 'Add Supplier' to create one."
      />

      {/* Create / Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Supplier Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Master Heel Sole Works"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="03009876543"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Industrial Area, City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openingBalance">
                Opening Balance (PKR ₨)
              </Label>
              <Input
                id="openingBalance"
                type="number"
                step="0.01"
                value={formData.openingBalance}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    openingBalance: Number(e.target.value),
                  })
                }
                placeholder="0.00 (Positive = we owe supplier)"
              />
              <p className="text-[11px] text-muted-foreground">
                Enter positive amount if you owe money to the supplier initially.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Materials supplied (heels, soles, leather), payment terms..."
                rows={2}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!deletingSupplier}
        onOpenChange={(open) => !open && setDeletingSupplier(null)}
        onConfirm={handleDelete}
        title={`Deactivate ${deletingSupplier?.name}?`}
        description="This supplier will be marked as inactive. Purchase records and supplier ledger history will remain intact."
        isDeleting={isDeleting}
      />
    </div>
  );
}
