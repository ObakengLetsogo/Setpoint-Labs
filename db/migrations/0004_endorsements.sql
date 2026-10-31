CREATE TABLE `endorsement_attempts` (
	`id` char(26) NOT NULL,
	`user_id` char(26) NOT NULL,
	`brand` varchar(20) NOT NULL,
	`paper` json NOT NULL,
	`answers` json,
	`started_at` datetime NOT NULL,
	`deadline_at` datetime NOT NULL,
	`submitted_at` datetime,
	`pct` int,
	`passed` boolean,
	CONSTRAINT `endorsement_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `endorsement_attempts_user` ON `endorsement_attempts` (`user_id`,`brand`);