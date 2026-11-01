ALTER TABLE `users` ADD `birth_date` datetime;--> statement-breakpoint
ALTER TABLE `users` ADD `guardian_name` varchar(120);--> statement-breakpoint
ALTER TABLE `users` ADD `guardian_email` varchar(254);--> statement-breakpoint
ALTER TABLE `users` ADD `guardian_token_hash` char(64);--> statement-breakpoint
ALTER TABLE `users` ADD `consent_requested_at` datetime;--> statement-breakpoint
ALTER TABLE `users` ADD `guardian_consent_at` datetime;