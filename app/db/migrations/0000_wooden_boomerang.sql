CREATE TABLE `capsules` (
	`id` serial AUTO_INCREMENT,
	`title` varchar(500) NOT NULL,
	`url` text NOT NULL,
	`color` varchar(20) NOT NULL DEFAULT '#00f0ff',
	`pinned` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `capsules_id` PRIMARY KEY(`id`)
);
