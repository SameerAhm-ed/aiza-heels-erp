import { sql } from "drizzle-orm";
import {
  sqliteTable,
  integer,
  text,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

/** All monetary amounts stored as INTEGER PAISA. Timestamps stored as unix ms integers. */

export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('now','subsec')*1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('now','subsec')*1000)`),
  },
  (t) => [uniqueIndex("categories_name_idx").on(t.name)]
);

export const expenseCategories = sqliteTable(
  "expense_categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('now','subsec')*1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('now','subsec')*1000)`),
  },
  (t) => [uniqueIndex("expense_categories_name_idx").on(t.name)]
);

export const customers = sqliteTable(
  "customers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    whatsappNumber: text("whatsapp_number"),
    address: text("address"),
    notes: text("notes"),
    /** PAISA. Positive = customer owes us. */
    openingBalance: integer("opening_balance").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('now','subsec')*1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('now','subsec')*1000)`),
  },
  (t) => [index("customers_name_idx").on(t.name), index("customers_active_idx").on(t.isActive)]
);

export const suppliers = sqliteTable(
  "suppliers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    address: text("address"),
    notes: text("notes"),
    /** PAISA. Positive = we owe supplier. */
    openingBalance: integer("opening_balance").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('now','subsec')*1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('now','subsec')*1000)`),
  },
  (t) => [index("suppliers_name_idx").on(t.name), index("suppliers_active_idx").on(t.isActive)]
);

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    model: text("model"),
    material: text("material"),
    unit: text("unit").notNull().default("pair"),
    minStockAlert: integer("min_stock_alert").notNull().default(5),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('now','subsec')*1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('now','subsec')*1000)`),
  },
  (t) => [
    index("products_category_idx").on(t.categoryId),
    index("products_active_idx").on(t.isActive),
  ]
);

/** Was an embedded array on Product; now its own table (one row per size+color variant). */
export const productVariants = sqliteTable(
  "product_variants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    size: text("size").notNull(),
    color: text("color").notNull(),
    currentStock: integer("current_stock").notNull().default(0),
    purchasePrice: integer("purchase_price").notNull().default(0), // PAISA
    sellingPrice: integer("selling_price").notNull().default(0), // PAISA
  },
  (t) => [
    uniqueIndex("product_variants_sku_idx").on(t.sku),
    index("product_variants_product_idx").on(t.productId),
    index("product_variants_stock_idx").on(t.currentStock),
  ]
);

export const sales = sqliteTable(
  "sales",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    invoiceNumber: text("invoice_number").notNull(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    subtotal: integer("subtotal").notNull(), // PAISA
    discount: integer("discount").notNull().default(0), // PAISA
    tax: integer("tax").notNull().default(0), // PAISA
    grandTotal: integer("grand_total").notNull(), // PAISA
    paidAmount: integer("paid_amount").notNull().default(0), // PAISA
    remainingAmount: integer("remaining_amount").notNull(), // PAISA
    paymentMethod: text("payment_method", { enum: ["cash", "bank"] })
      .notNull()
      .default("cash"),
    status: text("status", { enum: ["paid", "partial", "unpaid"] }).notNull(),
    notes: text("notes"),
    pdfPath: text("pdf_path"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('now','subsec')*1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('now','subsec')*1000)`),
  },
  (t) => [
    uniqueIndex("sales_invoice_number_idx").on(t.invoiceNumber),
    index("sales_customer_created_idx").on(t.customerId, t.createdAt),
    index("sales_status_idx").on(t.status),
    index("sales_created_idx").on(t.createdAt),
  ]
);

/** Was an embedded array on Sale; now its own table. Line-level fields are snapshots at sale time. */
export const saleItems = sqliteTable(
  "sale_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    saleId: integer("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    productName: text("product_name").notNull(), // snapshotted
    variantSku: text("variant_sku").notNull(),
    size: text("size").notNull(),
    color: text("color").notNull(),
    qty: integer("qty").notNull(),
    unitPrice: integer("unit_price").notNull(), // PAISA
    discount: integer("discount").notNull().default(0), // PAISA per-line
    costPrice: integer("cost_price").notNull(), // PAISA — COGS snapshot
    lineTotal: integer("line_total").notNull(), // PAISA
  },
  (t) => [index("sale_items_sale_idx").on(t.saleId)]
);

export const purchases = sqliteTable(
  "purchases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    grandTotal: integer("grand_total").notNull(), // PAISA
    paidAmount: integer("paid_amount").notNull().default(0), // PAISA
    remainingAmount: integer("remaining_amount").notNull(), // PAISA
    paymentMethod: text("payment_method", { enum: ["cash", "bank"] })
      .notNull()
      .default("cash"),
    status: text("status", { enum: ["paid", "partial", "unpaid"] }).notNull(),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('now','subsec')*1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('now','subsec')*1000)`),
  },
  (t) => [
    index("purchases_supplier_created_idx").on(t.supplierId, t.createdAt),
    index("purchases_status_idx").on(t.status),
    index("purchases_created_idx").on(t.createdAt),
  ]
);

/** Was an embedded array on Purchase; now its own table. */
export const purchaseItems = sqliteTable(
  "purchase_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    purchaseId: integer("purchase_id")
      .notNull()
      .references(() => purchases.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    productName: text("product_name").notNull(),
    variantSku: text("variant_sku").notNull(),
    qty: integer("qty").notNull(),
    unitCost: integer("unit_cost").notNull(), // PAISA
    lineTotal: integer("line_total").notNull(), // PAISA
  },
  (t) => [index("purchase_items_purchase_idx").on(t.purchaseId)]
);

export const expenses = sqliteTable(
  "expenses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => expenseCategories.id),
    description: text("description").notNull(),
    amount: integer("amount").notNull(), // PAISA
    date: integer("date", { mode: "timestamp_ms" }).notNull(),
    paymentMethod: text("payment_method", { enum: ["cash", "bank"] })
      .notNull()
      .default("cash"),
    attachmentPath: text("attachment_path"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('now','subsec')*1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('now','subsec')*1000)`),
  },
  (t) => [
    index("expenses_category_idx").on(t.categoryId),
    index("expenses_date_idx").on(t.date),
    index("expenses_payment_method_idx").on(t.paymentMethod),
  ]
);

/**
 * Single ledger table with partyType discriminator.
 * Covers: Customer Ledger, Supplier Ledger, Cash Ledger, Expense Ledger.
 * runningBalance computed and stored at write time. All amounts in PAISA.
 */
export const ledgerEntries = sqliteTable(
  "ledger_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: integer("date", { mode: "timestamp_ms" }).notNull(),
    type: text("type", { enum: ["debit", "credit"] }).notNull(),
    referenceType: text("reference_type", {
      enum: ["sale", "purchase", "expense", "payment", "adjustment", "opening_balance"],
    }).notNull(),
    referenceId: integer("reference_id"),
    debit: integer("debit").notNull().default(0), // PAISA
    credit: integer("credit").notNull().default(0), // PAISA
    runningBalance: integer("running_balance").notNull(), // PAISA
    /** customerId or supplierId; null for cash/expense */
    party: integer("party"),
    partyType: text("party_type", {
      enum: ["customer", "supplier", "cash", "expense"],
    }).notNull(),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('now','subsec')*1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('now','subsec')*1000)`),
  },
  (t) => [
    index("ledger_party_idx").on(t.party, t.partyType, t.date),
    index("ledger_partytype_idx").on(t.partyType, t.date),
    index("ledger_reference_idx").on(t.referenceId),
  ]
);

/**
 * Immutable audit trail of every inventory change.
 * delta: positive = stock increased, negative = stock decreased.
 * resultingBalance: stock level AFTER this movement.
 */
export const stockMovements = sqliteTable(
  "stock_movements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    variantSku: text("variant_sku").notNull(),
    type: text("type", {
      enum: ["sale", "purchase", "adjustment", "return_sale", "return_purchase"],
    }).notNull(),
    delta: integer("delta").notNull(),
    resultingBalance: integer("resulting_balance").notNull(),
    referenceId: integer("reference_id"), // saleId / purchaseId, null for adjustment
    reason: text("reason"), // required for "adjustment" type
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('now','subsec')*1000)`),
  },
  (t) => [
    index("stock_movements_product_variant_idx").on(t.productId, t.variantSku, t.createdAt),
    index("stock_movements_reference_idx").on(t.referenceId),
  ]
);

/** Singleton settings row. id is always 1. */
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey().default(1),
  appName: text("app_name").notNull().default("Aiza Heels"),
  currency: text("currency").notNull().default("PKR"),
  taxRate: real("tax_rate").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('now','subsec')*1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('now','subsec')*1000)`),
});

/** id is the year string (e.g. "2026"). sequence increments per invoice. */
export const invoiceCounters = sqliteTable("invoice_counters", {
  id: text("id").primaryKey(), // year
  sequence: integer("sequence").notNull().default(0),
});
