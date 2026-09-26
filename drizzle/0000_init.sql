CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`finding_id` text NOT NULL,
	`user_id` text NOT NULL,
	`kind` text DEFAULT 'new' NOT NULL,
	`channel` text DEFAULT 'email' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`error` text,
	`sent_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`finding_id`) REFERENCES `findings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `alerts_finding_idx` ON `alerts` (`finding_id`);--> statement-breakpoint
CREATE TABLE `findings` (
	`id` text PRIMARY KEY NOT NULL,
	`scan_id` text NOT NULL,
	`target_id` text NOT NULL,
	`user_id` text NOT NULL,
	`rule_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`severity` text NOT NULL,
	`title` text NOT NULL,
	`detail` text,
	`subject` text,
	`first_seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`resolved_at` integer,
	`last_notified_at` integer,
	FOREIGN KEY (`scan_id`) REFERENCES `scans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_id`) REFERENCES `targets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `findings_target_idx` ON `findings` (`target_id`);--> statement-breakpoint
CREATE INDEX `findings_user_idx` ON `findings` (`user_id`);--> statement-breakpoint
CREATE INDEX `findings_open_idx` ON `findings` (`target_id`,`resolved_at`);--> statement-breakpoint
CREATE TABLE `scans` (
	`id` text PRIMARY KEY NOT NULL,
	`target_id` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`trigger` text DEFAULT 'manual' NOT NULL,
	`started_at` integer,
	`finished_at` integer,
	`duration_ms` integer,
	`error` text,
	`snapshot_json` text,
	FOREIGN KEY (`target_id`) REFERENCES `targets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `scans_target_idx` ON `scans` (`target_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `targets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`domain` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`last_scan_at` integer,
	`last_status` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `targets_user_domain_idx` ON `targets` (`user_id`,`domain`);--> statement-breakpoint
CREATE INDEX `targets_user_idx` ON `targets` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text,
	`plan` text DEFAULT 'free' NOT NULL,
	`ls_customer_id` text,
	`ls_subscription_id` text,
	`ls_subscription_status` text,
	`ls_customer_portal_url` text,
	`ls_variant_id` text,
	`charity_claimed` integer DEFAULT false NOT NULL,
	`charity_verified` integer DEFAULT false NOT NULL,
	`charity_name` text,
	`charity_number` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_name` text NOT NULL,
	`payload_json` text,
	`received_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`processed_at` integer,
	`outcome` text
);
--> statement-breakpoint
CREATE INDEX `webhook_events_name_idx` ON `webhook_events` (`event_name`);