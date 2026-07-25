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
import { Customer } from "@/types";
import { formatPaisaAsPKR, fromPaisa } from "@/lib/currency";
import { Plus, Eye, Edit, Trash2, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    whatsappNumber: "",
    address: "",
    notes: "",
    openingBalance: 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal state
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/customers?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setCustomers(json.data);
        setTotal(json.pagination.total);
      } else {
        toast.error(json.error || "Failed to load customers");
      }
    } catch {
      toast.error("Network error loading customers");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormData({
      name: "",
      phone: "",
      whatsappNumber: "",
      address: "",
      notes: "",
      openingBalance: 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      whatsappNumber: customer.whatsappNumber || "",
      address: customer.address || "",
      notes: customer.notes || "",
      openingBalance: fromPaisa(customer.openingBalance),
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
      const url = editingCustomer
        ? `/api/customers/${editingCustomer._id}`
        : "/api/customers";
      const method = editingCustomer ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(
          editingCustomer ? "Customer updated!" : "Customer created!"
        );
        setIsModalOpen(false);
        fetchCustomers();
      } else {
        toast.error(json.error || "Failed to save customer");
      }
    } catch {
      toast.error("Error saving customer");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/customers/${deletingCustomer._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Customer deactivated successfully");
        setDeletingCustomer(null);
        fetchCustomers();
      } else {
        toast.error(json.error || "Failed to deactivate customer");
      }
    } catch {
      toast.error("Error deactivating customer");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<Customer>[] = [
    {
      header: "Customer Name",
      accessorKey: "name",
      cell: (row) => (
        <div>
          <Link
            href={`/customers/${row._id}`}
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
      header: "WhatsApp",
      cell: (row) => {
        const wa = row.whatsappNumber || row.phone;
        const cleanWa = wa.replace(/\D/g, "");
        return (
          <a
            href={`https://wa.me/${cleanWa}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-mono"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{wa}</span>
          </a>
        );
      },
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
            <Link href={`/customers/${row._id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleOpenEdit(row)}
            title="Edit Customer"
          >
            <Edit className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => setDeletingCustomer(row)}
            title="Deactivate Customer"
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
        title="Customer Management"
        description="View, add, search, and manage customer accounts and ledger profiles."
      >
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          <span>Add Customer</span>
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={customers}
        total={total}
        page={page}
        limit={limit}
        isLoading={isLoading}
        search={search}
        onSearchChange={setSearch}
        onPageChange={setPage}
        onLimitChange={setLimit}
        searchPlaceholder="Search customer by name or phone..."
        emptyMessage="No customers found. Click 'Add Customer' to create one."
      />

      {/* Create / Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Edit Customer" : "Add New Customer"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Customer Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Metro Shoes Wholesale"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="03001234567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp Number</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsappNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, whatsappNumber: e.target.value })
                  }
                  placeholder="Defaults to phone"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Shop #, Market, City"
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
                placeholder="0.00 (Positive = owes us)"
              />
              <p className="text-[11px] text-muted-foreground">
                Enter positive amount if customer owes you money initially.
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
                placeholder="Payment terms, special discounts, contacts..."
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
                {isSaving ? "Saving..." : "Save Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!deletingCustomer}
        onOpenChange={(open) => !open && setDeletingCustomer(null)}
        onConfirm={handleDelete}
        title={`Deactivate ${deletingCustomer?.name}?`}
        description="This customer will be marked as inactive. All sales and ledger entry history will be safely preserved."
        isDeleting={isDeleting}
      />
    </div>
  );
}
