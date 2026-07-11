CREATE TABLE `collection_items` (
	`collection_id` bigint unsigned NOT NULL,
	`capsule_id` bigint unsigned NOT NULL,
	`added_at` timestamp NOT NULL DEFAULT (now()),
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `collection_items_collection_id_capsule_id_pk` PRIMARY KEY(`collection_id`,`capsule_id`)
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`cover_color` varchar(20),
	`visibility` varchar(20) NOT NULL DEFAULT 'private',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `collection_items` ADD CONSTRAINT `collection_items_collection_id_collections_id_fk` FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collection_items` ADD CONSTRAINT `collection_items_capsule_id_capsules_id_fk` FOREIGN KEY (`capsule_id`) REFERENCES `capsules`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collections` ADD CONSTRAINT `collections_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `collections_user_idx` ON `collections` (`user_id`);