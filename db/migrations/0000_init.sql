CREATE TABLE `assessment_runs` (
	`id` char(26) NOT NULL,
	`user_id` char(26) NOT NULL,
	`assessment_id` varchar(60) NOT NULL,
	`source` text NOT NULL,
	`language` enum('ladder','st') NOT NULL,
	`passed` boolean NOT NULL,
	`results` json NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `assessment_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assessments` (
	`id` varchar(60) NOT NULL,
	`track_id` varchar(40) NOT NULL,
	`title` varchar(160) NOT NULL,
	`rig_id` varchar(40) NOT NULL,
	CONSTRAINT `assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assignments` (
	`id` char(26) NOT NULL,
	`cohort_id` char(26) NOT NULL,
	`lesson_id` varchar(60) NOT NULL,
	`due_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` char(26) NOT NULL,
	`actor_id` char(26),
	`action` varchar(80) NOT NULL,
	`subject` varchar(120),
	`detail` json,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `certificates` (
	`id` char(26) NOT NULL,
	`code` varchar(16) NOT NULL,
	`user_id` char(26) NOT NULL,
	`track_id` varchar(40) NOT NULL,
	`name_on_certificate` varchar(120) NOT NULL,
	`organisation_id` char(26),
	`issued_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`revoked_at` datetime,
	CONSTRAINT `certificates_id` PRIMARY KEY(`id`),
	CONSTRAINT `certificates_code` UNIQUE(`code`),
	CONSTRAINT `certificates_user_track` UNIQUE(`user_id`,`track_id`)
);
--> statement-breakpoint
CREATE TABLE `chapters` (
	`id` varchar(60) NOT NULL,
	`track_id` varchar(40) NOT NULL,
	`title` varchar(120) NOT NULL,
	`position` int NOT NULL,
	`free` boolean NOT NULL DEFAULT false,
	CONSTRAINT `chapters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cohort_members` (
	`cohort_id` char(26) NOT NULL,
	`user_id` char(26) NOT NULL,
	CONSTRAINT `cohort_members_cohort_id_user_id_pk` PRIMARY KEY(`cohort_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `cohorts` (
	`id` char(26) NOT NULL,
	`organisation_id` char(26) NOT NULL,
	`name` varchar(120) NOT NULL,
	`teacher_id` char(26),
	`platform_lock` varchar(16),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `cohorts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_verifications` (
	`token_hash` char(64) NOT NULL,
	`user_id` char(26) NOT NULL,
	`expires_at` datetime NOT NULL,
	`used_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `email_verifications_token_hash` PRIMARY KEY(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `enquiries` (
	`id` char(26) NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(254) NOT NULL,
	`organisation` varchar(160) NOT NULL,
	`seats` int,
	`message` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `enquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `entitlements` (
	`id` char(26) NOT NULL,
	`user_id` char(26),
	`organisation_id` char(26),
	`plan_id` varchar(40) NOT NULL,
	`seats` int NOT NULL DEFAULT 1,
	`starts_at` datetime NOT NULL,
	`ends_at` datetime NOT NULL,
	`status` enum('active','revoked') NOT NULL DEFAULT 'active',
	`source` enum('payment','invoice','admin') NOT NULL,
	`note` varchar(255),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `entitlements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` char(26) NOT NULL,
	`number` varchar(32) NOT NULL,
	`organisation_id` char(26) NOT NULL,
	`plan_id` varchar(40) NOT NULL,
	`seats` int NOT NULL,
	`amount_cents` int NOT NULL,
	`status` enum('open','paid','void') NOT NULL DEFAULT 'open',
	`paid_at` datetime,
	`marked_paid_by` char(26),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_number_unique` UNIQUE(`number`)
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` varchar(60) NOT NULL,
	`chapter_id` varchar(60) NOT NULL,
	`rig_id` varchar(40) NOT NULL,
	`title` varchar(160) NOT NULL,
	`position` int NOT NULL,
	CONSTRAINT `lessons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`user_id` char(26) NOT NULL,
	`organisation_id` char(26) NOT NULL,
	`role` enum('learner','teacher','employer_admin','institution_admin','platform_admin') NOT NULL DEFAULT 'learner',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `memberships_user_id_organisation_id_pk` PRIMARY KEY(`user_id`,`organisation_id`)
);
--> statement-breakpoint
CREATE TABLE `organisations` (
	`id` char(26) NOT NULL,
	`name` varchar(160) NOT NULL,
	`kind` enum('employer','institution') NOT NULL,
	`platform_lock` varchar(16),
	`certificate_name` varchar(160),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `organisations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_resets` (
	`token_hash` char(64) NOT NULL,
	`user_id` char(26) NOT NULL,
	`expires_at` datetime NOT NULL,
	`used_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `password_resets_token_hash` PRIMARY KEY(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `payment_events` (
	`id` varchar(191) NOT NULL,
	`provider` varchar(20) NOT NULL,
	`type` varchar(80) NOT NULL,
	`payment_id` char(26),
	`payload` json NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `payment_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` char(26) NOT NULL,
	`user_id` char(26) NOT NULL,
	`organisation_id` char(26),
	`plan_id` varchar(40) NOT NULL,
	`seats` int NOT NULL DEFAULT 1,
	`provider` varchar(20) NOT NULL,
	`provider_payment_id` varchar(191),
	`amount_cents` int NOT NULL,
	`currency` char(3) NOT NULL DEFAULT 'ZAR',
	`status` enum('pending','paid','failed','cancelled','expired') NOT NULL DEFAULT 'pending',
	`raw_payload` json,
	`paid_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_provider_id` UNIQUE(`provider`,`provider_payment_id`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` varchar(40) NOT NULL,
	`name` varchar(80) NOT NULL,
	`audience` enum('learner','employer','institution') NOT NULL,
	`price_cents` int NOT NULL,
	`period_months` int NOT NULL,
	`per_seat` boolean NOT NULL DEFAULT false,
	`min_seats` int NOT NULL DEFAULT 1,
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `progress` (
	`user_id` char(26) NOT NULL,
	`lesson_id` varchar(60) NOT NULL,
	`status` enum('started','ran','completed') NOT NULL,
	`score` int,
	`completed_at` datetime,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `progress_user_id_lesson_id_pk` PRIMARY KEY(`user_id`,`lesson_id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_attempts` (
	`id` char(26) NOT NULL,
	`user_id` char(26) NOT NULL,
	`lesson_id` varchar(60) NOT NULL,
	`score` int NOT NULL,
	`total` int NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `quiz_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rigs` (
	`id` varchar(40) NOT NULL,
	`name` varchar(120) NOT NULL,
	CONSTRAINT `rigs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_programs` (
	`id` char(26) NOT NULL,
	`user_id` char(26) NOT NULL,
	`slot` varchar(80) NOT NULL,
	`rig_id` varchar(40) NOT NULL,
	`language` enum('ladder','st') NOT NULL,
	`source` text NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `saved_programs_id` PRIMARY KEY(`id`),
	CONSTRAINT `saved_programs_slot` UNIQUE(`user_id`,`slot`,`language`)
);
--> statement-breakpoint
CREATE TABLE `seats` (
	`id` char(26) NOT NULL,
	`organisation_id` char(26) NOT NULL,
	`entitlement_id` char(26) NOT NULL,
	`user_id` char(26),
	`assigned_at` datetime,
	CONSTRAINT `seats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` char(64) NOT NULL,
	`user_id` char(26) NOT NULL,
	`expires_at` datetime NOT NULL,
	`user_agent` varchar(255),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` char(26) NOT NULL,
	`assignment_id` char(26) NOT NULL,
	`user_id` char(26) NOT NULL,
	`source` text NOT NULL,
	`language` enum('ladder','st') NOT NULL,
	`passed` boolean NOT NULL,
	`grade` int,
	`feedback` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` char(26) NOT NULL,
	`user_id` char(26),
	`organisation_id` char(26),
	`plan_id` varchar(40) NOT NULL,
	`status` enum('active','past_due','cancelled') NOT NULL DEFAULT 'active',
	`current_period_end` datetime NOT NULL,
	`renewal_reminder_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` varchar(40) NOT NULL,
	`code` varchar(4) NOT NULL,
	`name` varchar(120) NOT NULL,
	`position` int NOT NULL,
	CONSTRAINT `tracks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` char(26) NOT NULL,
	`email` varchar(254) NOT NULL,
	`name` varchar(120) NOT NULL,
	`password_hash` varchar(255),
	`google_id` varchar(64),
	`email_verified_at` datetime,
	`role` enum('learner','teacher','employer_admin','institution_admin','platform_admin') NOT NULL DEFAULT 'learner',
	`platform` varchar(16) NOT NULL DEFAULT 'iec',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email` UNIQUE(`email`),
	CONSTRAINT `users_google` UNIQUE(`google_id`)
);
--> statement-breakpoint
CREATE INDEX `assessment_runs_user` ON `assessment_runs` (`user_id`,`assessment_id`);--> statement-breakpoint
CREATE INDEX `assignments_cohort` ON `assignments` (`cohort_id`);--> statement-breakpoint
CREATE INDEX `audit_log_action` ON `audit_log` (`action`,`created_at`);--> statement-breakpoint
CREATE INDEX `cohorts_org` ON `cohorts` (`organisation_id`);--> statement-breakpoint
CREATE INDEX `entitlements_user` ON `entitlements` (`user_id`);--> statement-breakpoint
CREATE INDEX `entitlements_org` ON `entitlements` (`organisation_id`);--> statement-breakpoint
CREATE INDEX `memberships_org` ON `memberships` (`organisation_id`);--> statement-breakpoint
CREATE INDEX `payments_user` ON `payments` (`user_id`);--> statement-breakpoint
CREATE INDEX `quiz_attempts_user` ON `quiz_attempts` (`user_id`,`lesson_id`);--> statement-breakpoint
CREATE INDEX `seats_org` ON `seats` (`organisation_id`);--> statement-breakpoint
CREATE INDEX `seats_user` ON `seats` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `submissions_assignment` ON `submissions` (`assignment_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_user` ON `subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_org` ON `subscriptions` (`organisation_id`);