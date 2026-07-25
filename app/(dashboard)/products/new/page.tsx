"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Category } from "@/types";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    model: "",
    material: "",
    unit: "pair",
    minStockAlert: 5,
  });

  const [variants, setVariants] = useState([
    {
      sku: "",
      size: "37",
      color: "Black",
      currentStock: 10,
      purchasePrice: 1500,
      sellingPrice: 2800,
    },
  ]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/categories");
        const json = await res.json();
        if (json.success) {
          setCategories(json.data);
          if (json.data.length > 0) {
            setFormData((prev) => ({ ...prev, categoryId: json.data[0]._id }));
          }
        }
      } catch {
        toast.error("Failed to load categories");
      }
    }
    loadCategories();
  }, []);

  const handleAddVariant = () => {
    const size = String(37 + variants.length);
    const sku = formData.name
      ? `${formData.name.toUpperCase().replace(/\s+/g, "-")}-${size}`
      : `SKU-${Date.now()}`;

    setVariants([
      ...variants,
      {
        sku,
        size,
        color: "Black",
        currentStock: 10,
        purchasePrice: 1500,
        sellingPrice: 2800,
      },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length === 1) {
      return toast.error("Product must have at least one variant");
    }
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleVariantChange = (
    index: number,
    field: keyof (typeof variants)[0],
    value: string | number
  ) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.categoryId) {
      return toast.error("Product name and category are required");
    }

    // Check SKU uniqueness among variants
    const skus = variants.map((v) => v.sku.trim());
    if (skus.some((s) => !s)) {
      return toast.error("All variants must have a valid SKU");
    }
    if (new Set(skus).size !== skus.length) {
      return toast.error("Variant SKUs must be unique");
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          variants,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Product created successfully!");
        router.push("/products");
      } else {
        toast.error(json.error || "Failed to create product");
      }
    } catch {
      toast.error("Error creating product");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1">
          <Link href="/products">
            <ArrowLeft className="h-4 w-4" />
            <span>Products</span>
          </Link>
        </Button>
        <span>/</span>
        <span className="text-foreground font-medium">New Product</span>
      </div>

      <PageHeader
        title="Add New Heel Product"
        description="Enter product details, category, and size/color variant stock pricing."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              General Specifications
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                required
                placeholder="e.g. Velvet Ankle Strap Stiletto"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
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
              <Label htmlFor="model">Heel Model / Style</Label>
              <Input
                id="model"
                placeholder="e.g. 3.5-inch Pencil Heel"
                value={formData.model}
                onChange={(e) =>
                  setFormData({ ...formData, model: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="material">Material</Label>
              <Input
                id="material"
                placeholder="e.g. Synthetic Leather, Velvet, Patent"
                value={formData.material}
                onChange={(e) =>
                  setFormData({ ...formData, material: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alert">Min Stock Alert Level (pairs)</Label>
              <Input
                id="alert"
                type="number"
                min="0"
                value={formData.minStockAlert}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minStockAlert: Number(e.target.value),
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Variants Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Variants (Size & Color Combinations)
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddVariant}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Add Variant</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {variants.map((v, idx) => (
              <div
                key={idx}
                className="p-4 border rounded-lg bg-muted/20 grid grid-cols-1 md:grid-cols-6 gap-3 items-end relative"
              >
                <div className="space-y-1 md:col-span-1">
                  <Label className="text-xs">SKU *</Label>
                  <Input
                    required
                    className="font-mono text-xs h-8"
                    value={v.sku}
                    onChange={(e) =>
                      handleVariantChange(idx, "sku", e.target.value)
                    }
                    placeholder="HEEL-BLK-37"
                  />
                </div>

                <div className="space-y-1 md:col-span-1">
                  <Label className="text-xs">Size</Label>
                  <Input
                    required
                    className="h-8 text-xs"
                    value={v.size}
                    onChange={(e) =>
                      handleVariantChange(idx, "size", e.target.value)
                    }
                    placeholder="37, 38, 39"
                  />
                </div>

                <div className="space-y-1 md:col-span-1">
                  <Label className="text-xs">Color</Label>
                  <Input
                    required
                    className="h-8 text-xs"
                    value={v.color}
                    onChange={(e) =>
                      handleVariantChange(idx, "color", e.target.value)
                    }
                    placeholder="Black, Red, Nude"
                  />
                </div>

                <div className="space-y-1 md:col-span-1">
                  <Label className="text-xs">Initial Stock</Label>
                  <Input
                    type="number"
                    min="0"
                    className="h-8 text-xs font-mono"
                    value={v.currentStock}
                    onChange={(e) =>
                      handleVariantChange(idx, "currentStock", Number(e.target.value))
                    }
                  />
                </div>

                <div className="space-y-1 md:col-span-1">
                  <Label className="text-xs">Cost Price (₨)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="h-8 text-xs font-mono"
                    value={v.purchasePrice}
                    onChange={(e) =>
                      handleVariantChange(
                        idx,
                        "purchasePrice",
                        Number(e.target.value)
                      )
                    }
                  />
                </div>

                <div className="space-y-1 md:col-span-1 flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Sale Price (₨)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-8 text-xs font-mono"
                      value={v.sellingPrice}
                      onChange={(e) =>
                        handleVariantChange(
                          idx,
                          "sellingPrice",
                          Number(e.target.value)
                        )
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive shrink-0 mt-5"
                    onClick={() => handleRemoveVariant(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild disabled={isSaving}>
            <Link href="/products">Cancel</Link>
          </Button>
          <Button type="submit" size="lg" disabled={isSaving}>
            {isSaving ? "Saving Product..." : "Create Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}
