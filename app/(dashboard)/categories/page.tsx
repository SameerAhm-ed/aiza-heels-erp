"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { toast } from "sonner";
import { Category, ExpenseCategory } from "@/types";
import { Plus, Edit, Trash2, FolderTree, Receipt } from "lucide-react";

export default function CategoriesPage() {
  const [productCategories, setProductCategories] = useState<Category[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals for Product Category
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [editingProdCat, setEditingProdCat] = useState<Category | null>(null);
  const [prodCatName, setProdCatName] = useState("");
  const [prodCatDesc, setProdCatDesc] = useState("");
  const [deletingProdCat, setDeletingProdCat] = useState<Category | null>(null);

  // Modals for Expense Category
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [editingExpCat, setEditingExpCat] = useState<ExpenseCategory | null>(null);
  const [expCatName, setExpCatName] = useState("");
  const [expCatDesc, setExpCatDesc] = useState("");
  const [deletingExpCat, setDeletingExpCat] = useState<ExpenseCategory | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [pRes, eRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/expense-categories"),
      ]);
      const pJson = await pRes.json();
      const eJson = await eRes.json();

      if (pJson.success) setProductCategories(pJson.data);
      if (eJson.success) setExpenseCategories(eJson.data);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Product category handlers
  const handleSaveProd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodCatName) return toast.error("Category name is required");
    setIsSaving(true);
    try {
      const url = editingProdCat
        ? `/api/categories/${editingProdCat._id}`
        : "/api/categories";
      const method = editingProdCat ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: prodCatName, description: prodCatDesc }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editingProdCat ? "Category updated!" : "Category created!");
        setIsProdModalOpen(false);
        fetchAll();
      } else {
        toast.error(json.error || "Failed to save category");
      }
    } catch {
      toast.error("Error saving category");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProd = async () => {
    if (!deletingProdCat) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/categories/${deletingProdCat._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Category deleted!");
        setDeletingProdCat(null);
        fetchAll();
      } else {
        toast.error(json.error || "Failed to delete category");
      }
    } catch {
      toast.error("Error deleting category");
    } finally {
      setIsDeleting(false);
    }
  };

  // Expense category handlers
  const handleSaveExp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expCatName) return toast.error("Expense category name is required");
    setIsSaving(true);
    try {
      const url = editingExpCat
        ? `/api/expense-categories/${editingExpCat._id}`
        : "/api/expense-categories";
      const method = editingExpCat ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: expCatName, description: expCatDesc }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editingExpCat ? "Category updated!" : "Category created!");
        setIsExpModalOpen(false);
        fetchAll();
      } else {
        toast.error(json.error || "Failed to save category");
      }
    } catch {
      toast.error("Error saving category");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExp = async () => {
    if (!deletingExpCat) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/expense-categories/${deletingExpCat._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Expense category deleted!");
        setDeletingExpCat(null);
        fetchAll();
      } else {
        toast.error(json.error || "Failed to delete expense category");
      }
    } catch {
      toast.error("Error deleting expense category");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Category Management"
        description="Configure product classification categories and expense tracking categories."
      />

      <Tabs defaultValue="product" className="space-y-6">
        <TabsList>
          <TabsTrigger value="product" className="gap-2">
            <FolderTree className="h-4 w-4" />
            <span>Product Categories ({productCategories.length})</span>
          </TabsTrigger>
          <TabsTrigger value="expense" className="gap-2">
            <Receipt className="h-4 w-4" />
            <span>Expense Categories ({expenseCategories.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Product Categories Tab */}
        <TabsContent value="product" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Categories used to group heel products (e.g., Stilettos, Wedges, Pumps, Block Heels).
            </p>
            <Button
              onClick={() => {
                setEditingProdCat(null);
                setProdCatName("");
                setProdCatDesc("");
                setIsProdModalOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Product Category</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {productCategories.map((cat) => (
              <Card key={cat._id.toString()} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-semibold">
                    {cat.name}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingProdCat(cat);
                        setProdCatName(cat.name);
                        setProdCatDesc(cat.description || "");
                        setIsProdModalOpen(true);
                      }}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setDeletingProdCat(cat)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {cat.description || "No description provided."}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Expense Categories Tab */}
        <TabsContent value="expense" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              User-editable expense categories (e.g., Factory Overhead, Salaries, Raw Leather, Transport, Utilities).
            </p>
            <Button
              onClick={() => {
                setEditingExpCat(null);
                setExpCatName("");
                setExpCatDesc("");
                setIsExpModalOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Expense Category</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {expenseCategories.map((cat) => (
              <Card key={cat._id.toString()} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-semibold">
                    {cat.name}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingExpCat(cat);
                        setExpCatName(cat.name);
                        setExpCatDesc(cat.description || "");
                        setIsExpModalOpen(true);
                      }}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setDeletingExpCat(cat)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {cat.description || "No description provided."}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Product Category Modal */}
      <Dialog open={isProdModalOpen} onOpenChange={setIsProdModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProdCat ? "Edit Product Category" : "Add Product Category"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveProd} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pname">Category Name *</Label>
              <Input
                id="pname"
                required
                value={prodCatName}
                onChange={(e) => setProdCatName(e.target.value)}
                placeholder="e.g. Stiletto Heels"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdesc">Description</Label>
              <Input
                id="pdesc"
                value={prodCatDesc}
                onChange={(e) => setProdCatDesc(e.target.value)}
                placeholder="Optional notes about this heel style..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsProdModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expense Category Modal */}
      <Dialog open={isExpModalOpen} onOpenChange={setIsExpModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingExpCat ? "Edit Expense Category" : "Add Expense Category"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveExp} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ename">Expense Category Name *</Label>
              <Input
                id="ename"
                required
                value={expCatName}
                onChange={(e) => setExpCatName(e.target.value)}
                placeholder="e.g. Factory Overhead"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edesc">Description</Label>
              <Input
                id="edesc"
                value={expCatDesc}
                onChange={(e) => setExpCatDesc(e.target.value)}
                placeholder="Optional details..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsExpModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Product Category Dialog */}
      <DeleteConfirmDialog
        open={!!deletingProdCat}
        onOpenChange={(open) => !open && setDeletingProdCat(null)}
        onConfirm={handleDeleteProd}
        title={`Delete Category "${deletingProdCat?.name}"?`}
        description="Will fail if active products currently reference this category."
        isDeleting={isDeleting}
      />

      {/* Delete Expense Category Dialog */}
      <DeleteConfirmDialog
        open={!!deletingExpCat}
        onOpenChange={(open) => !open && setDeletingExpCat(null)}
        onConfirm={handleDeleteExp}
        title={`Delete Expense Category "${deletingExpCat?.name}"?`}
        description="Will fail if existing expense records reference this category."
        isDeleting={isDeleting}
      />
    </div>
  );
}
