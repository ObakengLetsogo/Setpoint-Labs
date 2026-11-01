ALTER TABLE `users` ADD `founding_number` int;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_founding` UNIQUE(`founding_number`);