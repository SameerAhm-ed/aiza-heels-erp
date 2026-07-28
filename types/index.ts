

// ─── Common ────────────────────────────────────────────────────────────────

export interface MongoDocument {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  dateFrom?: string;
  dateTo?: string;
}

// ─── Customer ──────────────────────────────────────────────────────────────

export interface Customer extends MongoDocument {
  name: string;
  phone: string;
  whatsappNumber?: string;
  address?: string;
  notes?: string;
  /** Opening balance in PAISA (positive = customer owes us, negative = we owe customer) */
  openingBalance: number;
  isActive: boolean;
}

// ─── Supplier ──────────────────────────────────────────────────────────────

export interface Supplier extends MongoDocument {
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  /** Opening balance in PAISA (positive = we owe supplier, negative = supplier owes us) */
  openingBalance: number;
  isActive: boolean;
}

// ─── Category (Product Category) ───────────────────────────────────────────

export interface Category extends MongoDocument {
  name: string;
  description?: string;
  isActive: boolean;
}

// ─── Expense Category ──────────────────────────────────────────────────────

export interface ExpenseCategory extends MongoDocument {
  name: string;
  description?: string;
}

// ─── Product ───────────────────────────────────────────────────────────────

export interface ProductVariant {
  sku: string; // unique per variant, e.g. "HEEL-RED-6"
  size: string; // e.g. "6", "7", "8", "8.5"
  color: string; // e.g. "Red", "Black"
  currentStock: number; // in units (pairs)
  purchasePrice: number; // PAISA — may differ per variant
  sellingPrice: number; // PAISA
}

export interface Product extends MongoDocument {
  name: string;
  categoryId: string;
  category?: Category;
  model?: string; // heel model name, e.g. "Stiletto 3-inch"
  material?: string;
  unit: string; // e.g. "pair"
  minStockAlert: number;
  isActive: boolean;
  variants: ProductVariant[];
}

// ─── Sale ──────────────────────────────────────────────────────────────────

export type SaleStatus = "paid" | "partial" | "unpaid";
export type PaymentMethod = "cash" | "bank";

export interface SaleItem {
  productId: string;
  productName: string; // snapshotted name at time of sale
  variantSku: string;
  size: string;
  color: string;
  qty: number;
  unitPrice: number; // PAISA — from sellingPrice but editable
  discount: number; // PAISA — per-line discount
  costPrice: number; // PAISA — snapshotted purchasePrice (COGS)
  lineTotal: number; // PAISA — (unitPrice - discount) * qty
}

export interface Sale extends MongoDocument {
  invoiceNumber: string; // e.g. "INV-2026-0001"
  customerId: string;
  customer?: Customer;
  items: SaleItem[];
  subtotal: number; // PAISA — sum of lineTotals
  discount: number; // PAISA — invoice-level discount
  tax: number; // PAISA — invoice-level tax
  grandTotal: number; // PAISA — subtotal - discount + tax
  paidAmount: number; // PAISA
  remainingAmount: number; // PAISA — grandTotal - paidAmount
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  notes?: string;
  pdfPath?: string; // path to generated PDF
  createdAt: Date;
}

// ─── Purchase ──────────────────────────────────────────────────────────────

export interface PurchaseItem {
  productId: string;
  productName: string;
  variantSku: string;
  qty: number;
  unitCost: number; // PAISA
  lineTotal: number; // PAISA
}

export type PurchaseStatus = "paid" | "partial" | "unpaid";

export interface Purchase extends MongoDocument {
  supplierId: string;
  supplier?: Supplier;
  items: PurchaseItem[];
  grandTotal: number; // PAISA
  paidAmount: number; // PAISA
  remainingAmount: number; // PAISA
  paymentMethod: PaymentMethod;
  status: PurchaseStatus;
  notes?: string;
  createdAt: Date;
}

// ─── Expense ───────────────────────────────────────────────────────────────

export interface Expense extends MongoDocument {
  categoryId: string;
  category?: ExpenseCategory;
  description: string;
  amount: number; // PAISA
  date: Date;
  paymentMethod: PaymentMethod;
  attachmentPath?: string;
}

// ─── Ledger ────────────────────────────────────────────────────────────────

export type LedgerEntryType = "debit" | "credit";
export type LedgerReferenceType =
  | "sale"
  | "purchase"
  | "expense"
  | "payment"
  | "adjustment"
  | "opening_balance";
export type LedgerPartyType = "customer" | "supplier" | "cash" | "expense";

export interface LedgerEntry extends MongoDocument {
  date: Date;
  type: LedgerEntryType;
  referenceType: LedgerReferenceType;
  referenceId?: string;
  debit: number; // PAISA
  credit: number; // PAISA
  runningBalance: number; // PAISA — maintained at write time for fast ledger display
  party?: string; // customerId or supplierId, null for cash/expense
  partyType: LedgerPartyType;
  notes?: string;
  /** Product name/SKU/qty for entries backed by a sale or purchase invoice. */
  items?: { productName: string; variantSku: string; qty: number }[];
}

// ─── Stock Movement ────────────────────────────────────────────────────────

export type StockMovementType =
  | "sale"
  | "purchase"
  | "adjustment"
  | "return_sale"
  | "return_purchase";

export interface StockMovement extends MongoDocument {
  productId: string;
  variantSku: string;
  type: StockMovementType;
  delta: number; // positive = stock added, negative = stock removed
  resultingBalance: number; // stock level after this movement
  referenceId?: string;
  reason?: string; // required for "adjustment" type
}

// ─── Invoice Counter ───────────────────────────────────────────────────────

export interface InvoiceCounter {
  _id: string; // e.g. "2026"
  sequence: number;
}

// ─── Settings ──────────────────────────────────────────────────────────────

export interface Settings {
  _id: string; // singleton — always "main"
  appName: string;
  // WhatsApp credentials are loaded from env vars, NOT stored here.
  // This doc holds non-sensitive display preferences.
  currency: string;
  taxRate: number; // default tax %, e.g. 17 for 17% GST
  lowStockThreshold: number; // default if product has no custom minStockAlert
}

// ─── Dashboard ─────────────────────────────────────────────────────────────

export interface DashboardStats {
  todaySales: number; // PAISA
  todayExpenses: number; // PAISA
  cashInHand: number; // PAISA
  bankBalance: number; // PAISA
  outstandingReceivables: number; // PAISA
  monthlyRevenue: number; // PAISA
  monthlyExpenses: number; // PAISA
  lowStockProducts: LowStockProduct[];
  recentTransactions: RecentTransaction[];
  salesLast30Days: DaySalesSummary[];
  expensesByCategory: CategoryExpenseSummary[];
}

export interface LowStockProduct {
  productId: string;
  productName: string;
  variantSku: string;
  size: string;
  color: string;
  currentStock: number;
  minStockAlert: number;
}

export interface RecentTransaction {
  id: string;
  type: "sale" | "purchase" | "expense" | "payment";
  description: string;
  amount: number; // PAISA
  date: Date;
  referenceNumber?: string;
}

export interface DaySalesSummary {
  date: string; // "YYYY-MM-DD"
  total: number; // PAISA
  count: number;
}

export interface CategoryExpenseSummary {
  category: string;
  total: number; // PAISA
}
