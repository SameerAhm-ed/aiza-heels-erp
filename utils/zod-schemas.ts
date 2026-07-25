import { z } from "zod";

// ─── Shared primitives ──────────────────────────────────────────────────────

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const objectIdSchema = z.string().min(24).max(24);

const paymentMethodSchema = z.enum(["cash", "bank"]);

// ─── Customer ──────────────────────────────────────────────────────────────

export const customerCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().min(1, "Phone is required").max(20),
  whatsappNumber: z.string().max(20).optional(),
  address: z.string().max(300).optional(),
  notes: z.string().max(1000).optional(),
  /** Opening balance in RUPEES (UI sends rupees; service converts to paisa) */
  openingBalance: z.coerce.number().default(0),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;

// ─── Supplier ──────────────────────────────────────────────────────────────

export const supplierCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().min(1, "Phone is required").max(20),
  address: z.string().max(300).optional(),
  notes: z.string().max(1000).optional(),
  openingBalance: z.coerce.number().default(0),
});

export const supplierUpdateSchema = supplierCreateSchema.partial();

export type SupplierCreateInput = z.infer<typeof supplierCreateSchema>;
export type SupplierUpdateInput = z.infer<typeof supplierUpdateSchema>;

// ─── Category ──────────────────────────────────────────────────────────────

export const categoryCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

// ─── Expense Category ──────────────────────────────────────────────────────

export const expenseCategoryCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
});

export const expenseCategoryUpdateSchema = expenseCategoryCreateSchema.partial();

export type ExpenseCategoryCreateInput = z.infer<typeof expenseCategoryCreateSchema>;

// ─── Product Variant ───────────────────────────────────────────────────────

export const productVariantSchema = z.object({
  sku: z.string().min(1, "SKU is required").max(50),
  size: z.string().min(1, "Size is required").max(20),
  color: z.string().min(1, "Color is required").max(50),
  currentStock: z.coerce.number().int().min(0).default(0),
  purchasePrice: z.coerce.number().min(0, "Purchase price must be >= 0"),
  sellingPrice: z.coerce.number().min(0, "Selling price must be >= 0"),
});

// ─── Product ───────────────────────────────────────────────────────────────

export const productCreateSchema = z.object({
  name: z.string().min(1, "Product name is required").max(150),
  categoryId: objectIdSchema,
  model: z.string().max(100).optional(),
  material: z.string().max(100).optional(),
  unit: z.string().default("pair"),
  minStockAlert: z.coerce.number().int().min(0).default(5),
  variants: z
    .array(productVariantSchema)
    .min(1, "At least one variant is required"),
});

export const productUpdateSchema = productCreateSchema.partial();

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

// ─── Sale ──────────────────────────────────────────────────────────────────

export const saleItemInputSchema = z.object({
  productId: objectIdSchema,
  variantSku: z.string().min(1),
  qty: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.coerce.number().min(0), // rupees
  discount: z.coerce.number().min(0).default(0), // rupees per line
});

export const saleCreateSchema = z.object({
  customerId: objectIdSchema,
  items: z.array(saleItemInputSchema).min(1, "At least one item is required"),
  discount: z.coerce.number().min(0).default(0), // invoice-level discount, rupees
  tax: z.coerce.number().min(0).default(0), // rupees
  paidAmount: z.coerce.number().min(0).default(0), // rupees
  paymentMethod: paymentMethodSchema.default("cash"),
  notes: z.string().max(1000).optional(),
});

export type SaleCreateInput = z.infer<typeof saleCreateSchema>;

// Payment recording against existing sale
export const salePaymentSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  paymentMethod: paymentMethodSchema,
  notes: z.string().max(500).optional(),
});

export type SalePaymentInput = z.infer<typeof salePaymentSchema>;

// ─── Purchase ──────────────────────────────────────────────────────────────

export const purchaseItemInputSchema = z.object({
  productId: objectIdSchema,
  variantSku: z.string().min(1),
  qty: z.coerce.number().int().min(1),
  unitCost: z.coerce.number().min(0), // rupees
});

export const purchaseCreateSchema = z.object({
  supplierId: objectIdSchema,
  items: z.array(purchaseItemInputSchema).min(1, "At least one item is required"),
  paidAmount: z.coerce.number().min(0).default(0),
  paymentMethod: paymentMethodSchema.default("cash"),
  notes: z.string().max(1000).optional(),
});

export type PurchaseCreateInput = z.infer<typeof purchaseCreateSchema>;

// ─── Expense ───────────────────────────────────────────────────────────────

export const expenseCreateSchema = z.object({
  categoryId: objectIdSchema,
  description: z.string().min(1, "Description is required").max(500),
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  date: z.string().min(1, "Date is required"), // "YYYY-MM-DD"
  paymentMethod: paymentMethodSchema.default("cash"),
});

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;

// ─── Stock Adjustment ──────────────────────────────────────────────────────

export const stockAdjustmentSchema = z.object({
  productId: objectIdSchema,
  variantSku: z.string().min(1),
  newStock: z.coerce.number().int().min(0),
  reason: z.string().min(1, "Reason is required for stock adjustments").max(500),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

// ─── Pagination (shared) ───────────────────────────────────────────────────

export { paginationSchema };
export type PaginationInput = z.infer<typeof paginationSchema>;

// ─── Settings ──────────────────────────────────────────────────────────────

export const settingsUpdateSchema = z.object({
  appName: z.string().min(1).max(100).optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
});

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;

// ─── Report filters ────────────────────────────────────────────────────────

export const reportFilterSchema = z.object({
  dateFrom: z.string().min(1, "Start date is required"),
  dateTo: z.string().min(1, "End date is required"),
  categoryId: z.string().optional(),
  customerId: z.string().optional(),
  supplierId: z.string().optional(),
});

export type ReportFilterInput = z.infer<typeof reportFilterSchema>;
