CREATE TABLE `exchange_connections` (
	`key` text PRIMARY KEY NOT NULL,
	`encrypted` text NOT NULL,
	`key_hint` text NOT NULL,
	`label` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
