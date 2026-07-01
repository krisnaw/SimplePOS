PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sale_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`item_type` text NOT NULL,
	`product_id` integer,
	`service_id` integer,
	`name` text NOT NULL,
	`sku` text,
	`quantity` integer NOT NULL,
	`base_price` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`price_overridden_by_id` integer,
	`price_overridden_at` text,
	`line_total` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`price_overridden_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
INSERT INTO `__new_sale_items` (
	`id`,
	`sale_id`,
	`item_type`,
	`product_id`,
	`service_id`,
	`name`,
	`sku`,
	`quantity`,
	`base_price`,
	`unit_price`,
	`price_overridden_by_id`,
	`price_overridden_at`,
	`line_total`,
	`created_at`
)
SELECT
	`id`,
	`sale_id`,
	`item_type`,
	`product_id`,
	`service_id`,
	`name`,
	`sku`,
	`quantity`,
	`unit_price`,
	`unit_price`,
	NULL,
	NULL,
	`line_total`,
	`created_at`
FROM `sale_items`;--> statement-breakpoint
DROP TABLE `sale_items`;--> statement-breakpoint
ALTER TABLE `__new_sale_items` RENAME TO `sale_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
