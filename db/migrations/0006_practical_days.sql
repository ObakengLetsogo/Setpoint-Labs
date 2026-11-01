CREATE TABLE `practical_bookings` (
	`id` char(26) NOT NULL,
	`day_id` char(26) NOT NULL,
	`user_id` char(26) NOT NULL,
	`status` enum('booked','cancelled','attended','absent') NOT NULL DEFAULT 'booked',
	`signed_off` boolean NOT NULL DEFAULT false,
	`facilitator_id` char(26),
	`note` text,
	`booked_at` datetime NOT NULL,
	`cancelled_at` datetime,
	CONSTRAINT `practical_bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practical_days` (
	`id` char(26) NOT NULL,
	`title` varchar(160) NOT NULL,
	`stage` int,
	`starts_at` datetime NOT NULL,
	`venue` varchar(200) NOT NULL,
	`capacity` int NOT NULL,
	`notes` text,
	`cancelled_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `practical_days_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `practical_bookings_day` ON `practical_bookings` (`day_id`);--> statement-breakpoint
CREATE INDEX `practical_bookings_user` ON `practical_bookings` (`user_id`);