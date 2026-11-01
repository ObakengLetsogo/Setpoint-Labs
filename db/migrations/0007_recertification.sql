CREATE TABLE `recert_attempts` (
	`id` char(26) NOT NULL,
	`user_id` char(26) NOT NULL,
	`level` char(1) NOT NULL,
	`paper` json NOT NULL,
	`answers` json,
	`started_at` datetime NOT NULL,
	`deadline_at` datetime NOT NULL,
	`submitted_at` datetime,
	`pct` int,
	`passed` boolean,
	CONSTRAINT `recert_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `certificates` ADD `expires_at` datetime;--> statement-breakpoint
ALTER TABLE `certificates` ADD `renewed_at` datetime;--> statement-breakpoint
ALTER TABLE `certificates` ADD `reminded_days` int;--> statement-breakpoint
CREATE INDEX `recert_attempts_user` ON `recert_attempts` (`user_id`,`level`);