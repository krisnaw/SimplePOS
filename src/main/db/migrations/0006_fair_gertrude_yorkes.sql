PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_vehicles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` integer,
	`customer_name` text,
	`customer_phone` text,
	`plate_number` text NOT NULL,
	`brand` text,
	`model` text NOT NULL,
	`year` integer,
	`vin` text,
	`color` text,
	`notes` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_vehicles`("id", "customer_id", "customer_name", "customer_phone", "plate_number", "brand", "model", "year", "vin", "color", "notes", "is_active", "created_at", "updated_at")
SELECT v."id", v."customer_id", c."name", c."phone", upper(replace(v."plate_number", ' ', '')), nullif(v."brand", ''), v."model", v."year", v."vin", v."color", v."notes", v."is_active", v."created_at", v."updated_at"
FROM `vehicles` v
LEFT JOIN `customers` c ON c."id" = v."customer_id";--> statement-breakpoint
DROP TABLE `vehicles`;--> statement-breakpoint
ALTER TABLE `__new_vehicles` RENAME TO `vehicles`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `vehicles_plate_number_unique` ON `vehicles` (`plate_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `vehicles_vin_unique` ON `vehicles` (`vin`);--> statement-breakpoint
ALTER TABLE `sales` ADD `vehicle_id` integer REFERENCES vehicles(id);--> statement-breakpoint
ALTER TABLE `sales` ADD `customer_name_snapshot` text;--> statement-breakpoint
ALTER TABLE `sales` ADD `customer_phone_snapshot` text;
