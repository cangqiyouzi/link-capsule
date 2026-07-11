CREATE TABLE `link_health` (
	`capsule_id` bigint unsigned NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'unknown',
	`http_code` int,
	`final_url` text,
	`last_checked_at` timestamp,
	`check_count` int NOT NULL DEFAULT 0,
	`last_error` text,
	CONSTRAINT `link_health_capsule_id` PRIMARY KEY(`capsule_id`)
);
--> statement-breakpoint
ALTER TABLE `link_health` ADD CONSTRAINT `link_health_capsule_id_capsules_id_fk` FOREIGN KEY (`capsule_id`) REFERENCES `capsules`(`id`) ON DELETE cascade ON UPDATE no action;