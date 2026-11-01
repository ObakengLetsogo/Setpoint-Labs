CREATE TABLE `expert_projects` (
	`id` char(26) NOT NULL,
	`user_id` char(26) NOT NULL,
	`opens_at` datetime NOT NULL,
	`due_at` datetime NOT NULL,
	`language` enum('ladder','st'),
	`source` text,
	`notes` text,
	`submitted_at` datetime,
	`tests_passed` boolean,
	`results` json,
	`assessor_id` char(26),
	`interview_at` datetime,
	`interview_link` varchar(300),
	`outcome` enum('pending','pass','fail') NOT NULL DEFAULT 'pending',
	`feedback` text,
	`decided_at` datetime,
	CONSTRAINT `expert_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `memberships` MODIFY COLUMN `role` enum('learner','teacher','employer_admin','institution_admin','assessor','platform_admin') NOT NULL DEFAULT 'learner';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('learner','teacher','employer_admin','institution_admin','assessor','platform_admin') NOT NULL DEFAULT 'learner';--> statement-breakpoint
CREATE INDEX `expert_projects_user` ON `expert_projects` (`user_id`);