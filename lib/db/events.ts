import { desc, eq } from "drizzle-orm";
import { eventInputSchema, type EventInput } from "../events/schema";
import { getDatabase, type EventDatabase } from ".";
import { events, type EventRow } from "./schema";

export function createEventRepository(db: EventDatabase) {
  return {
    create(input: unknown): EventRow {
      const event = eventInputSchema.parse(input);
      return db
        .insert(events)
        .values({
          ...event,
          occurredAt: new Date(event.occurredAt).toISOString(),
          normalizedLabel: event.normalizedLabel ?? null,
          severity: event.severity ?? null,
          note: event.note ?? null,
          rawText: event.rawText ?? null,
        })
        .returning()
        .get();
    },

    getById(id: number): EventRow | undefined {
      return db.select().from(events).where(eq(events.id, id)).get();
    },

    listAll(): EventRow[] {
      return db
        .select()
        .from(events)
        .orderBy(desc(events.occurredAt), desc(events.id))
        .all();
    },

    listRecent(limit = 5): EventRow[] {
      return db
        .select()
        .from(events)
        .orderBy(desc(events.occurredAt), desc(events.id))
        .limit(limit)
        .all();
    },

    update(id: number, input: unknown): EventRow | undefined {
      const event: EventInput = eventInputSchema.parse(input);
      return db
        .update(events)
        .set({
          ...event,
          occurredAt: new Date(event.occurredAt).toISOString(),
          normalizedLabel: event.normalizedLabel ?? null,
          severity: event.severity ?? null,
          note: event.note ?? null,
          rawText: event.rawText ?? null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(events.id, id))
        .returning()
        .get();
    },

    delete(id: number): boolean {
      return db.delete(events).where(eq(events.id, id)).returning().get() !== undefined;
    },
  };
}

export function getEventRepository() {
  return createEventRepository(getDatabase());
}
