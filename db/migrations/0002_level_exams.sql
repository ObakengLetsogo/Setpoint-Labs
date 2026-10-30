CREATE TABLE `exam_attempts` (
	`id` char(26) NOT NULL,
	`user_id` char(26) NOT NULL,
	`level` char(1) NOT NULL,
	`kind` enum('credit','free_resit') NOT NULL,
	`paper` json NOT NULL,
	`answers` json,
	`started_at` datetime NOT NULL,
	`deadline_at` datetime NOT NULL,
	`submitted_at` datetime,
	`theory_pct` int,
	`practical_passed` boolean,
	`passed` boolean,
	CONSTRAINT `exam_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `exam_attempts_user` ON `exam_attempts` (`user_id`,`level`);