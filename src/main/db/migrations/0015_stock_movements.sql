CREATE TABLE IF NOT EXISTS `stock_movements` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `product_id` integer NOT NULL REFERENCES `products`(`id`),
  `sku_snapshot` text NOT NULL,
  `product_name_snapshot` text NOT NULL,
  `unit_type_snapshot` text NOT NULL,
  `movement_type` text NOT NULL,
  `quantity_delta` integer NOT NULL,
  `balance_after` integer NOT NULL,
  `reference_type` text,
  `reference_id` integer,
  `reference_number` text,
  `reason` text,
  `created_by_id` integer REFERENCES `users`(`id`),
  `created_by_name_snapshot` text,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  CONSTRAINT `stock_movements_quantity_delta_non_zero` CHECK (`quantity_delta` <> 0),
  CONSTRAINT `stock_movements_balance_after_non_negative` CHECK (`balance_after` >= 0),
  CONSTRAINT `stock_movements_type_valid` CHECK (`movement_type` IN ('opening', 'purchase', 'sale', 'adjustment'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `stock_movements_product_history_idx` ON `stock_movements` (`product_id`, `created_at` DESC, `id` DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `stock_movements_type_created_at_idx` ON `stock_movements` (`movement_type`, `created_at` DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `stock_movements_created_by_id_idx` ON `stock_movements` (`created_by_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `stock_movements_reference_unique`
ON `stock_movements` (`reference_type`, `reference_id`)
WHERE `reference_type` IS NOT NULL AND `reference_id` IS NOT NULL;
--> statement-breakpoint
INSERT INTO `stock_movements` (
  `product_id`,
  `sku_snapshot`,
  `product_name_snapshot`,
  `unit_type_snapshot`,
  `movement_type`,
  `quantity_delta`,
  `balance_after`,
  `reference_type`,
  `reference_id`,
  `reference_number`,
  `reason`,
  `created_by_id`,
  `created_by_name_snapshot`,
  `created_at`
)
SELECT
  `products`.`id`,
  `products`.`sku`,
  `products`.`name`,
  `products`.`unit_type`,
  'opening',
  `products`.`stock_qty`,
  `products`.`stock_qty`,
  'product',
  `products`.`id`,
  'Opening balance',
  'Balance imported when inventory ledger was enabled',
  NULL,
  'System',
  CURRENT_TIMESTAMP
FROM `products`
WHERE `products`.`stock_qty` > 0
  AND NOT EXISTS (
    SELECT 1 FROM `stock_movements`
    WHERE `stock_movements`.`product_id` = `products`.`id`
  );
