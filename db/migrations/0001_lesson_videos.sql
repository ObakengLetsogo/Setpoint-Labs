CREATE TABLE `lesson_videos` (
	`lesson_id` varchar(60) NOT NULL,
	`video_file` varchar(120),
	`poster_file` varchar(120),
	`captions_file` varchar(120),
	`duration_s` int,
	`chapters` json,
	`published` boolean NOT NULL DEFAULT false,
	`updated_by` char(26),
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `lesson_videos_lesson_id` PRIMARY KEY(`lesson_id`)
);
