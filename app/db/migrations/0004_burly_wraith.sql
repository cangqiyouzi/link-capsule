CREATE TABLE `follows` (
	`follower_id` varchar(255) NOT NULL,
	`following_id` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `follows_follower_id_following_id_pk` PRIMARY KEY(`follower_id`,`following_id`)
);
--> statement-breakpoint
ALTER TABLE `capsules` ADD `share_token` varchar(64);--> statement-breakpoint
ALTER TABLE `follows` ADD CONSTRAINT `follows_follower_id_user_id_fk` FOREIGN KEY (`follower_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `follows` ADD CONSTRAINT `follows_following_id_user_id_fk` FOREIGN KEY (`following_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `follows_following_idx` ON `follows` (`following_id`);