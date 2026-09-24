import assert from "node:assert/strict";
import test from "node:test";
import { sql } from "drizzle-orm";
import { connectDatabase } from "../lib/db";
import { createEventRepository } from "../lib/db/events";
import { eventInputSchema } from "../lib/events/schema";
import {
  formatLocalTime,
  formatLocalDateTimeInput,
  localDateKey,
  localDateTimeToIso,
} from "../lib/events/datetime";

test("event input accepts the four event types with a valid UTC timestamp", () => {
  for (const type of ["meal", "symptom", "context", "other"] as const) {
    const result = eventInputSchema.safeParse({
      type,
      occurredAt: "2026-09-24T03:00:00.000Z",
      label: "ラーメン",
      severity: type === "symptom" ? 6 : null,
    });

    assert.equal(result.success, true);
  }
});

test("severity is an integer from 0 to 10 and only belongs to symptoms", () => {
  const base = {
    type: "symptom",
    occurredAt: "2026-09-24T03:00:00.000Z",
    label: "腹痛",
  };

  assert.equal(eventInputSchema.safeParse({ ...base, severity: 0 }).success, true);
  assert.equal(eventInputSchema.safeParse({ ...base, severity: 10 }).success, true);
  assert.equal(eventInputSchema.safeParse({ ...base, severity: 11 }).success, false);
  assert.equal(eventInputSchema.safeParse({ ...base, severity: 6.5 }).success, false);
  assert.equal(
    eventInputSchema.safeParse({ ...base, type: "meal", severity: 6 }).success,
    false,
  );
});

test("event input requires a timezone-aware valid timestamp and a nonempty label", () => {
  const base = {
    type: "meal",
    occurredAt: "2026-09-24T03:00:00.000Z",
    label: "ラーメン",
  };

  assert.equal(eventInputSchema.safeParse(base).success, true);
  assert.equal(
    eventInputSchema.safeParse({ ...base, occurredAt: "2026-09-24T03:00" }).success,
    false,
  );
  assert.equal(eventInputSchema.safeParse({ ...base, label: "   " }).success, false);
});

test("local datetime input stores a UTC ISO string and renders back in local time", () => {
  const localValue = "2026-09-24T12:34";
  const stored = localDateTimeToIso(localValue);

  assert.equal(stored, new Date(localValue).toISOString());
  assert.equal(formatLocalDateTimeInput(stored), localValue);
});

test("local datetime input rejects invalid values", () => {
  assert.throws(() => localDateTimeToIso("not-a-date"));
  assert.throws(() => localDateTimeToIso("2026-02-30T12:00"));
});

test("timeline date key and time use the process local timezone", () => {
  const iso = "2026-09-24T00:30:00.000Z";
  const date = new Date(iso);
  const expectedKey = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  const expectedTime = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  assert.equal(localDateKey(iso), expectedKey);
  assert.equal(formatLocalTime(iso), expectedTime);
});

test("event repository creates, lists, updates and deletes an event", () => {
  const connection = connectDatabase(":memory:");
  const repository = createEventRepository(connection.db);

  try {
    const meal = repository.create({
      type: "meal",
      occurredAt: "2026-09-24T03:00:00.000Z",
      label: "ラーメン",
      rawText: "昼にラーメンを食べた",
    });
    const symptom = repository.create({
      type: "symptom",
      occurredAt: "2026-09-24T11:00:00.000Z",
      label: "腹痛",
      severity: 6,
    });

    assert.equal(repository.getById(meal.id)?.rawText, "昼にラーメンを食べた");
    assert.deepEqual(repository.listAll().map((event) => event.id), [symptom.id, meal.id]);
    assert.deepEqual(repository.listRecent(1).map((event) => event.id), [symptom.id]);

    const updated = repository.update(meal.id, {
      type: "meal",
      occurredAt: "2026-09-24T03:30:00.000Z",
      label: "味噌ラーメン",
      note: "家で食べた",
    });
    assert.equal(updated?.label, "味噌ラーメン");
    assert.equal(updated?.note, "家で食べた");
    assert.equal(updated?.rawText, null);
    assert.equal(repository.delete(symptom.id), true);
    assert.equal(repository.delete(symptom.id), false);
    assert.deepEqual(repository.listAll().map((event) => event.id), [meal.id]);
  } finally {
    connection.close();
  }
});

test("event repository validates input before writing to SQLite", () => {
  const connection = connectDatabase(":memory:");
  const repository = createEventRepository(connection.db);

  try {
    assert.throws(() =>
      repository.create({
        type: "meal",
        occurredAt: "2026-09-24T03:00:00.000Z",
        label: "ラーメン",
        severity: 6,
      }),
    );
    assert.equal(repository.listAll().length, 0);
    assert.throws(() =>
      connection.db.run(
        sql.raw(
          "insert into events (type, occurred_at, label) values ('unknown', '2026-09-24T03:00:00.000Z', 'x')",
        ),
      ),
    );
  } finally {
    connection.close();
  }
});

test("event repository stores timestamps as UTC ISO strings", () => {
  const connection = connectDatabase(":memory:");
  const repository = createEventRepository(connection.db);

  try {
    const event = repository.create({
      type: "meal",
      occurredAt: "2026-09-24T12:00:00+09:00",
      label: "おにぎり",
    });

    assert.equal(event.occurredAt, "2026-09-24T03:00:00.000Z");
  } finally {
    connection.close();
  }
});
