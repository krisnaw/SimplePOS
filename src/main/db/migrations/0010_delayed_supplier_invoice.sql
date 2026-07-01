DROP INDEX IF EXISTS `purchases_supplier_invoice_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `purchases_purchase_number_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `purchases_supplier_id_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `purchases_invoice_date_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `purchases_payment_status_idx`;--> statement-breakpoint
CREATE TABLE `purchases_delayed_invoice_migration` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purchase_number` text NOT NULL,
	`supplier_id` integer NOT NULL,
	`supplier_invoice_number` text,
	`normalized_invoice_number` text,
	`invoice_date` text,
	`payment_status` text DEFAULT 'unpaid' NOT NULL,
	`invoice_status` text DEFAULT 'received' NOT NULL,
	`due_date` text,
	`paid_at` text,
	`notes` text,
	`total` integer DEFAULT 0 NOT NULL,
	`created_by_id` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "purchases_total_non_negative" CHECK("purchases_delayed_invoice_migration"."total" >= 0)
);
--> statement-breakpoint
INSERT INTO `purchases_delayed_invoice_migration` (
	`id`,
	`purchase_number`,
	`supplier_id`,
	`supplier_invoice_number`,
	`normalized_invoice_number`,
	`invoice_date`,
	`payment_status`,
	`invoice_status`,
	`due_date`,
	`paid_at`,
	`notes`,
	`total`,
	`created_by_id`,
	`created_at`
)
SELECT
	`id`,
	`purchase_number`,
	`supplier_id`,
	NULLIF(`supplier_invoice_number`, ''),
	NULLIF(`normalized_invoice_number`, ''),
	NULLIF(`invoice_date`, ''),
	`payment_status`,
	CASE
		WHEN NULLIF(`normalized_invoice_number`, '') IS NULL OR NULLIF(`invoice_date`, '') IS NULL THEN 'pending'
		ELSE 'received'
	END,
	`due_date`,
	`paid_at`,
	`notes`,
	`total`,
	`created_by_id`,
	`created_at`
FROM `purchases`;
--> statement-breakpoint
DROP TABLE `purchases`;--> statement-breakpoint
ALTER TABLE `purchases_delayed_invoice_migration` RENAME TO `purchases`;--> statement-breakpoint
CREATE UNIQUE INDEX `purchases_purchase_number_unique` ON `purchases` (`purchase_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `purchases_supplier_invoice_unique` ON `purchases` (`supplier_id`,`normalized_invoice_number`) WHERE `normalized_invoice_number` IS NOT NULL AND `normalized_invoice_number` <> '';--> statement-breakpoint
CREATE INDEX `purchases_supplier_id_idx` ON `purchases` (`supplier_id`);--> statement-breakpoint
CREATE INDEX `purchases_invoice_date_idx` ON `purchases` (`invoice_date`);--> statement-breakpoint
CREATE INDEX `purchases_payment_status_idx` ON `purchases` (`payment_status`);--> statement-breakpoint
CREATE INDEX `purchases_invoice_status_idx` ON `purchases` (`invoice_status`);
