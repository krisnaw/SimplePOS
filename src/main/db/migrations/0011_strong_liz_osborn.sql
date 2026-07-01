CREATE UNIQUE INDEX `sales_open_vehicle_unique` ON `sales` (`vehicle_id`) WHERE "sales"."status" = 'in_progress' AND "sales"."vehicle_id" IS NOT NULL;
