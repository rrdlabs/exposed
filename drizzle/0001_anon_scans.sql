CREATE TABLE `anon_scans` (
	`token` text PRIMARY KEY NOT NULL,
	`domain` text NOT NULL,
	`ip_hash` text NOT NULL,
	`findings_json` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`duration_ms` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `anon_scans_ip_idx` ON `anon_scans` (`ip_hash`);