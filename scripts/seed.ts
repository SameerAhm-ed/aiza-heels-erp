import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

async function seed() {
  const { db } = await import("../lib/db");
  const {
    customers: customersTable,
    suppliers: suppliersTable,
    categories: categoriesTable,
    expenseCategories: expenseCategoriesTable,
    products: productsTable,
    productVariants: productVariantsTable,
    ledgerEntries,
    stockMovements,
    sales,
    saleItems,
    purchases,
    purchaseItems,
    expenses,
    invoiceCounters,
  } = await import("../lib/schema");

  const { createSale } = await import("../services/sale.service");
  const { createPurchase } = await import("../services/purchase.service");
  const { createExpense } = await import("../services/expense.service");

  console.log("Clearing existing database tables...");
  await db.delete(saleItems);
  await db.delete(purchaseItems);
  await db.delete(ledgerEntries);
  await db.delete(stockMovements);
  await db.delete(sales);
  await db.delete(purchases);
  await db.delete(expenses);
  await db.delete(invoiceCounters);
  await db.delete(productVariantsTable);
  await db.delete(productsTable);
  await db.delete(customersTable);
  await db.delete(suppliersTable);
  await db.delete(categoriesTable);
  await db.delete(expenseCategoriesTable);

  console.log("Seeding Product Categories...");
  const categories = await db
    .insert(categoriesTable)
    .values([
      { name: "Stiletto Heels", description: "Pencil & high heels for formal wear" },
      { name: "Wedge Heels", description: "Comfortable platform heel soles" },
      { name: "Block Heels", description: "Sturdy square chunky heels" },
      { name: "Kitten Heels", description: "Low 1.5 to 2 inch casual heels" },
    ])
    .returning();

  console.log("Seeding Expense Categories...");
  const expenseCategories = await db
    .insert(expenseCategoriesTable)
    .values([
      { name: "Factory Overhead", description: "Electricity, machinery maintenance" },
      { name: "Staff Salaries", description: "Craftsman & artisan wages" },
      { name: "Raw Leather & Materials", description: "Leather, soles, glue, straps" },
      { name: "Transport & Logistics", description: "Goods delivery & freight" },
      { name: "Utilities & Office", description: "Internet, tea, office supplies" },
    ])
    .returning();

  console.log("Seeding Customers...");
  const customers = await db
    .insert(customersTable)
    .values([
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
    ])
    .returning();

  console.log("Seeding Suppliers...");
  const suppliers = await db
    .insert(suppliersTable)
    .values([
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
    ])
    .returning();

  console.log("Seeding Products with Variants...");

  const productSeeds = [
    {
      name: "Velvet Ankle Strap Stiletto",
      categoryId: categories[0].id,
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
      categoryId: categories[1].id,
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
      categoryId: categories[2].id,
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
  ];

  const products = [];
  for (const seedProduct of productSeeds) {
    const { variants, ...productFields } = seedProduct;
    const [product] = await db.insert(productsTable).values(productFields).returning();
    await db
      .insert(productVariantsTable)
      .values(variants.map((v) => ({ ...v, productId: product.id })));
    products.push(product);
  }

  console.log("Seeding Sales Invoices across last 60 days...");
  await createSale({
    customerId: String(customers[0].id),
    items: [
      {
        productId: String(products[0].id),
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
    customerId: String(customers[1].id),
    items: [
      {
        productId: String(products[1].id),
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
    supplierId: String(suppliers[0].id),
    items: [
      {
        productId: String(products[0].id),
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
    categoryId: String(expenseCategories[0].id),
    description: "Factory Electricity Bill - July 2026",
    amount: 45000,
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "bank",
  });

  await createExpense({
    categoryId: String(expenseCategories[1].id),
    description: "Weekly Craftsmen Wages",
    amount: 60000,
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "cash",
  });

  console.log("Seed completed successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed script error:", err);
  process.exit(1);
});
