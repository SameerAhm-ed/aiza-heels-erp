import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/heel-erp?replicaSet=rs0";

async function seed() {
  console.log("Connecting to MongoDB for seeding:", MONGODB_URI);
  await mongoose.connect(MONGODB_URI);

  // Dynamic model imports
  const { CustomerModel } = await import("../models/customer.model");
  const { SupplierModel } = await import("../models/supplier.model");
  const { CategoryModel } = await import("../models/category.model");
  const { ExpenseCategoryModel } = await import("../models/expense-category.model");
  const { ProductModel } = await import("../models/product.model");
  const { createSale } = await import("../services/sale.service");
  const { createPurchase } = await import("../services/purchase.service");
  const { createExpense } = await import("../services/expense.service");
  const { LedgerEntryModel } = await import("../models/ledger-entry.model");
  const { StockMovementModel } = await import("../models/stock-movement.model");
  const { SaleModel } = await import("../models/sale.model");
  const { PurchaseModel } = await import("../models/purchase.model");
  const { ExpenseModel } = await import("../models/expense.model");
  const { InvoiceCounterModel } = await import("../models/invoice-counter.model");

  console.log("Clearing existing database collections...");
  await CustomerModel.deleteMany({});
  await SupplierModel.deleteMany({});
  await CategoryModel.deleteMany({});
  await ExpenseCategoryModel.deleteMany({});
  await ProductModel.deleteMany({});
  await LedgerEntryModel.deleteMany({});
  await StockMovementModel.deleteMany({});
  await SaleModel.deleteMany({});
  await PurchaseModel.deleteMany({});
  await ExpenseModel.deleteMany({});
  await InvoiceCounterModel.deleteMany({});

  console.log("Seeding Product Categories...");
  const categories = await CategoryModel.create([
    { name: "Stiletto Heels", description: "Pencil & high heels for formal wear" },
    { name: "Wedge Heels", description: "Comfortable platform heel soles" },
    { name: "Block Heels", description: "Sturdy square chunky heels" },
    { name: "Kitten Heels", description: "Low 1.5 to 2 inch casual heels" },
  ]);

  console.log("Seeding Expense Categories...");
  const expenseCategories = await ExpenseCategoryModel.create([
    { name: "Factory Overhead", description: "Electricity, machinery maintenance" },
    { name: "Staff Salaries", description: "Craftsman & artisan wages" },
    { name: "Raw Leather & Materials", description: "Leather, soles, glue, straps" },
    { name: "Transport & Logistics", description: "Goods delivery & freight" },
    { name: "Utilities & Office", description: "Internet, tea, office supplies" },
  ]);

  console.log("Seeding Customers...");
  const customers = await CustomerModel.create([
    {
      name: "Metro Shoes Wholesale",
      phone: "03001234567",
      whatsappNumber: "03001234567",
      address: "Shop #45, Liberty Market, Lahore",
      openingBalance: 500000, // 5,000 PKR opening balance
    },
    {
      name: "Stylo Traders Karachi",
      phone: "03219876543",
      whatsappNumber: "03219876543",
      address: "Tariq Road Market, Karachi",
      openingBalance: 0,
    },
    {
      name: "Bata Distributor Rawalpindi",
      phone: "03335554433",
      whatsappNumber: "03335554433",
      address: "Raja Bazaar, Rawalpindi",
      openingBalance: 1200000,
    },
  ]);

  console.log("Seeding Suppliers...");
  const suppliers = await SupplierModel.create([
    {
      name: "Master Sole & Heel Works",
      phone: "03017778899",
      address: "Plot #12, Industrial Estate, Gujranwala",
      openingBalance: 300000, // 3,000 PKR we owe
    },
    {
      name: "Italian Leather Import Co",
      phone: "03024445566",
      address: "Sialkot Tannery Zone",
      openingBalance: 0,
    },
  ]);

  console.log("Seeding Products with Variants...");
  const products = await ProductModel.create([
    {
      name: "Velvet Ankle Strap Stiletto",
      categoryId: categories[0]._id,
      model: "Pencil 3.5-inch",
      material: "Velvet & Synthetic Sole",
      unit: "pair",
      minStockAlert: 5,
      variants: [
        {
          sku: "ST-VEL-BLK-37",
          size: "37",
          color: "Black",
          currentStock: 25,
          purchasePrice: 150000, // 1,500 PKR
          sellingPrice: 280000, // 2,800 PKR
        },
        {
          sku: "ST-VEL-RED-38",
          size: "38",
          color: "Red",
          currentStock: 4, // Low stock trigger!
          purchasePrice: 150000,
          sellingPrice: 280000,
        },
      ],
    },
    {
      name: "Classic Cork Wedge Heel",
      categoryId: categories[1]._id,
      model: "Platform 2.5-inch",
      material: "Cork & Patent Leather",
      unit: "pair",
      minStockAlert: 5,
      variants: [
        {
          sku: "WD-CRK-BRN-37",
          size: "37",
          color: "Brown",
          currentStock: 30,
          purchasePrice: 180000, // 1,800 PKR
          sellingPrice: 320000, // 3,200 PKR
        },
        {
          sku: "WD-CRK-BLK-39",
          size: "39",
          color: "Black",
          currentStock: 15,
          purchasePrice: 180000,
          sellingPrice: 320000,
        },
      ],
    },
    {
      name: "Chunky Block Party Heel",
      categoryId: categories[2]._id,
      model: "Block 3-inch",
      material: "Suede Leather",
      unit: "pair",
      minStockAlert: 8,
      variants: [
        {
          sku: "BL-PARTY-GLD-38",
          size: "38",
          color: "Gold",
          currentStock: 3, // Low stock!
          purchasePrice: 200000,
          sellingPrice: 350000,
        },
      ],
    },
  ]);

  console.log("Seeding Sales Invoices across last 60 days...");
  await createSale({
    customerId: customers[0]._id.toString(),
    items: [
      {
        productId: products[0]._id.toString(),
        variantSku: "ST-VEL-BLK-37",
        qty: 5,
        unitPrice: 2800,
        discount: 100,
      },
    ],
    discount: 500,
    tax: 0,
    paidAmount: 10000,
    paymentMethod: "cash",
    notes: "Sample wholesale order",
  });

  await createSale({
    customerId: customers[1]._id.toString(),
    items: [
      {
        productId: products[1]._id.toString(),
        variantSku: "WD-CRK-BRN-37",
        qty: 8,
        unitPrice: 3200,
        discount: 0,
      },
    ],
    discount: 0,
    tax: 0,
    paidAmount: 25600,
    paymentMethod: "bank",
    notes: "Full payment received via bank transfer",
  });

  console.log("Seeding Purchases from suppliers...");
  await createPurchase({
    supplierId: suppliers[0]._id.toString(),
    items: [
      {
        productId: products[0]._id.toString(),
        variantSku: "ST-VEL-BLK-37",
        qty: 20,
        unitCost: 1500,
      },
    ],
    paidAmount: 20000,
    paymentMethod: "bank",
    notes: "Initial sole purchase batch",
  });

  console.log("Seeding Factory Expenses...");
  await createExpense({
    categoryId: expenseCategories[0]._id.toString(),
    description: "Factory Electricity Bill - July 2026",
    amount: 45000,
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "bank",
  });

  await createExpense({
    categoryId: expenseCategories[1]._id.toString(),
    description: "Weekly Craftsmen Wages",
    amount: 60000,
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "cash",
  });

  console.log("✅ Seed completed successfully!");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed script error:", err);
  process.exit(1);
});
