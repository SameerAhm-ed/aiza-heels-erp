CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch('now','subsec')*1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('now','subsec')*1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_idx` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`whatsapp_number` text,
	`address` text,
	`notes` text,
	`opening_balance` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch('now','subsec')*1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('now','subsec')*1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `customers_name_idx` ON `customers` (`name`);--> statement-breakpoint
CREATE INDEX `customers_active_idx` ON `customers` (`is_active`);--> statement-breakpoint
CREATE TABLE `expense_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch('now','subsec')*1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('now','subsec')*1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expense_categories_name_idx` ON `expense_categories` (`name`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer NOT NULL,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
	`date` integer NOT NULL,
	`payment_method` text DEFAULT 'cash' NOT NULL,
	`attachment_path` text,
	`created_at` integer DEFAULT (unixepoch('now','subsec')*1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('now','subsec')*1000) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `expense_categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `expenses_category_idx` ON `expenses` (`category_id`);--> statement-breakpoint
CREATE INDEX `expenses_date_idx` ON `expenses` (`date`);--> statement-breakpoint
CREATE INDEX `expenses_payment_method_idx` ON `expenses` (`payment_method`);--> statement-breakpoint
CREATE TABLE `invoice_counters` (
	`id` text PRIMARY KEY NOT NULL,
	`sequence` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` integer NOT NULL,
	`type` text NOT NULL,
	`reference_type` text NOT NULL,
	`reference_id` integer,
	`debit` integer DEFAULT 0 NOT NULL,
	`credit` integer DEFAULT 0 NOT NULL,
	`running_balance` integer NOT NULL,
	`party` integer,
	`party_type` text NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch('now','subsec')*1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('now','subsec')*1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ledger_party_idx` ON `ledger_entries` (`party`,`party_type`,`date`);--> statement-breakpoint
CREATE INDEX `ledger_partytype_idx` ON `ledger_entries` (`party_type`,`date`);--> statement-breakpoint
CREATE INDEX `ledger_reference_idx` ON `ledger_entries` (`reference_id`);--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`sku` text NOT NULL,
	`size` text NOT NULL,
	`color` text NOT NULL,
	`current_stock` integer DEFAULT 0 NOT NULL,
	`purchase_price` integer DEFAULT 0 NOT NULL,
	`selling_price` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_sku_idx` ON `product_variants` (`sku`);--> statement-breakpoint
CREATE INDEX `product_variants_product_idx` ON `product_variants` (`product_id`);--> statement-breakpoint
CREATE INDEX `product_variants_stock_idx` ON `product_variants` (`current_stock`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category_id` integer NOT NULL,
	`model` text,
	`material` text,
	`unit` text DEFAULT 'pair' NOT NULL,
	`min_stock_alert` integer DEFAULT 5 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch('now','subsec')*1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('now','subsec')*1000) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category_id`);--> statement-breakpoint
CREATE INDEX `products_active_idx` ON `products` (`is_active`);--> statement-breakpoint
CREATE TABLE `purchase_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purchase_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`product_name` text NOT NULL,
	`variant_sku` text NOT NULL,
	`qty` integer NOT NULL,
	`unit_cost` integer NOT NULL,
	`line_total` integer NOT NULL,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `purchase_items_purchase_idx` ON `purchase_items` (`purchase_id`);--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_id` integer NOT NULL,
	`grand_total` integer NOT NULL,
	`paid_amount` integer DEFAULT 0 NOT NULL,
	`remaining_amount` integer NOT NULL,
	`payment_method` text DEFAULT 'cash' NOT NULL,
	`status` text NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch('now','subsec')*1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('now','subsec')*1000) NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `purchases_supplier_created_idx` ON `purchases` (`supplier_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `purchases_status_idx` ON `purchases` (`status`);--> statement-breakpoint
CREATE INDEX `purchases_created_idx` ON `purchases` (`created_at`);--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`product_name` text NOT NULL,
	`variant_sku` text NOT NULL,
	`size` text NOT NULL,
	`color` text NOT NULL,
	`qty` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`cost_price` integer NOT NULL,
	`line_total` integer NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sale_items_sale_idx` ON `sale_items` (`sale_id`);--> statement-breakpoint
CREATE TABLE `sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_number` text NOT NULL,
	`customer_id` integer NOT NULL,
	`subtotal` integer NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`tax` integer DEFAULT 0 NOT NULL,
	`grand_total` integer NOT NULL,
	`paid_amount` integer DEFAULT 0 NOT NULL,
	`remaining_amount` integer NOT NULL,
	`payment_method` text DEFAULT 'cash' NOT NULL,
	`status` text NOT NULL,
	`notes` text,
	`pdf_path` text,
	`created_at` integer DEFAULT (unixepoch('now','subsec')*1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('now','subsec')*1000) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_invoice_number_idx` ON `sales` (`invoice_number`);--> statement-breakpoint
CREATE INDEX `sales_customer_created_idx` ON `sales` (`customer_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `sales_status_idx` ON `sales` (`status`);--> statement-breakpoint
CREATE INDEX `sales_created_idx` ON `sales` (`created_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`app_name` text DEFAULT 'HeelCraft ERP' NOT NULL,
	`currency` text DEFAULT 'PKR' NOT NULL,
	`tax_rate` real DEFAULT 0 NOT NULL,
	`low_stock_threshold` integer DEFAULT 5 NOT NULL,
	`created_at` integer DEFAULT (unixepoch('now','subsec')*1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('now','subsec')*1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`variant_sku` text NOT NULL,
	`type` text NOT NULL,
	`delta` integer NOT NULL,
	`resulting_balance` integer NOT NULL,
	`reference_id` integer,
	`reason` text,
	`created_at` integer DEFAULT (unixepoch('now','subsec')*1000) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `stock_movements_product_variant_idx` ON `stock_movements` (`product_id`,`variant_sku`,`created_at`);--> statement-breakpoint
CREATE INDEX `stock_movements_reference_idx` ON `stock_movements` (`reference_id`);--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`address` text,
	`notes` text,
	`opening_balance` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch('now','subsec')*1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('now','subsec')*1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `suppliers_name_idx` ON `suppliers` (`name`);--> statement-breakpoint
CREATE INDEX `suppliers_active_idx` ON `suppliers` (`is_active`);