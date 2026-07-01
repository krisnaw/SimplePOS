CREATE TABLE `purchase_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purchase_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`sku_snapshot` text NOT NULL,
	`product_name_snapshot` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_cost` integer NOT NULL,
	`line_total` integer NOT NULL,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "purchase_items_quantity_positive" CHECK("purchase_items"."quantity" > 0),
	CONSTRAINT "purchase_items_unit_cost_non_negative" CHECK("purchase_items"."unit_cost" >= 0),
	CONSTRAINT "purchase_items_line_total_non_negative" CHECK("purchase_items"."line_total" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_items_purchase_product_unique` ON `purchase_items` (`purchase_id`,`product_id`);--> statement-breakpoint
CREATE INDEX `purchase_items_purchase_id_idx` ON `purchase_items` (`purchase_id`);--> statement-breakpoint
CREATE INDEX `purchase_items_product_id_idx` ON `purchase_items` (`product_id`);--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purchase_number` text NOT NULL,
	`supplier_id` integer NOT NULL,
	`supplier_invoice_number` text NOT NULL,
	`normalized_invoice_number` text NOT NULL,
	`invoice_date` text NOT NULL,
	`payment_status` text DEFAULT 'unpaid' NOT NULL,
	`due_date` text,
	`paid_at` text,
	`notes` text,
	`total` integer DEFAULT 0 NOT NULL,
	`created_by_id` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "purchases_total_non_negative" CHECK("purchases"."total" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchases_purchase_number_unique` ON `purchases` (`purchase_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `purchases_supplier_invoice_unique` ON `purchases` (`supplier_id`,`normalized_invoice_number`);--> statement-breakpoint
CREATE INDEX `purchases_supplier_id_idx` ON `purchases` (`supplier_id`);--> statement-breakpoint
CREATE INDEX `purchases_invoice_date_idx` ON `purchases` (`invoice_date`);--> statement-breakpoint
CREATE INDEX `purchases_payment_status_idx` ON `purchases` (`payment_status`);--> statement-breakpoint
ALTER TABLE `products` ADD `last_purchase_cost` integer DEFAULT 0 NOT NULL;