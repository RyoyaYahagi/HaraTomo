CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`occurred_at` text NOT NULL,
	`label` text NOT NULL,
	`normalized_label` text,
	`severity` integer,
	`note` text,
	`raw_text` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "events_type_is_known" CHECK("events"."type" in ('meal', 'symptom', 'context', 'other')),
	CONSTRAINT "events_severity_matches_type" CHECK("events"."severity" is null or ("events"."type" = 'symptom' and "events"."severity" between 0 and 10))
);
--> statement-breakpoint
CREATE INDEX `events_occurred_at_idx` ON `events` (`occurred_at`);