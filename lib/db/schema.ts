import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { eventTypes } from "../events/schema";

export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    type: text("type", { enum: eventTypes }).notNull(),
    occurredAt: text("occurred_at").notNull(),
    label: text("label").notNull(),
    normalizedLabel: text("normalized_label"),
    severity: integer("severity"),
    note: text("note"),
    rawText: text("raw_text"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [
    check(
      "events_type_is_known",
      sql`${table.type} in ('meal', 'symptom', 'context', 'other')`,
    ),
    check(
      "events_severity_matches_type",
      sql`${table.severity} is null or (${table.type} = 'symptom' and ${table.severity} between 0 and 10)`,
    ),
    index("events_occurred_at_idx").on(table.occurredAt),
  ],
);

export type EventRow = typeof events.$inferSelect;
