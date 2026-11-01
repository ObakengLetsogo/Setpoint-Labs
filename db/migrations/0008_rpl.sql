CREATE TABLE `rpl_applications` (
	`id` char(26) NOT NULL,
	`user_id` char(26) NOT NULL,
	`level` char(1) NOT NULL,
	`years` int NOT NULL,
	`job_title` varchar(120) NOT NULL,
	`employer` varchar(160),
	`experience` text NOT NULL,
	`evidence` text NOT NULL,
	`qualifications` text,
	`status` enum('submitted','more_info','approved','declined') NOT NULL DEFAULT 'submitted',
	`approved_level` char(1),
	`assessor_id` char(26),
	`feedback` text,
	`submitted_at` datetime NOT NULL,
	`decided_at` datetime,
	CONSTRAINT `rpl_applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `rpl_user` ON `rpl_applications` (`user_id`);