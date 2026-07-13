ALTER TABLE `collections` ADD `share_token` varchar(64);
--> statement-breakpoint
CREATE UNIQUE INDEX `collections_share_token_idx` ON `collections` (`share_token`);
