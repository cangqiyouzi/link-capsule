CREATE TABLE `capsule_tags` (
	`capsule_id` bigint unsigned NOT NULL,
	`tag_id` bigint unsigned NOT NULL,
	CONSTRAINT `capsule_tags_capsule_id_tag_id_pk` PRIMARY KEY(`capsule_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(20),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_tag_name_idx` UNIQUE(`user_id`,`name`)
);
--> statement-breakpoint
ALTER TABLE `capsule_tags` ADD CONSTRAINT `capsule_tags_capsule_id_capsules_id_fk` FOREIGN KEY (`capsule_id`) REFERENCES `capsules`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `capsule_tags` ADD CONSTRAINT `capsule_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tags` ADD CONSTRAINT `tags_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;