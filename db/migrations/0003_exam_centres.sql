CREATE TABLE `exam_bookings` (
	`id` char(26) NOT NULL,
	`user_id` char(26) NOT NULL,
	`level` char(1) NOT NULL,
	`centre_id` char(26) NOT NULL,
	`session_at` datetime NOT NULL,
	`status` enum('booked','cancelled','sat','no_show') NOT NULL DEFAULT 'booked',
	`attempt_id` char(26),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `exam_bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exam_centres` (
	`id` char(26) NOT NULL,
	`name` varchar(160) NOT NULL,
	`area` varchar(120) NOT NULL,
	`address` varchar(255) NOT NULL,
	`code_hash` varchar(255) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `exam_centres_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD `booking_id` char(26);--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD `incidents` json;--> statement-breakpoint
CREATE INDEX `exam_bookings_user` ON `exam_bookings` (`user_id`);--> statement-breakpoint
CREATE INDEX `exam_bookings_centre` ON `exam_bookings` (`centre_id`,`session_at`);