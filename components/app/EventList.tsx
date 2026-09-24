"use client";

import Link from "next/link";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { EventRow } from "@/lib/db/schema";
import { formatLocalDate, formatLocalTime, localDateKey } from "@/lib/events/datetime";
import { clearRecordDraft } from "@/lib/events/draft";
import type { EventType } from "@/lib/events/schema";

const typeLabels: Record<EventType, string> = {
  meal: "食事",
  symptom: "症状",
  context: "生活",
  other: "その他",
};

type EventListProps = {
  events: EventRow[];
  groupByDate?: boolean;
  clearDraftOnLoad?: boolean;
};

function subscribeToHydration(): () => void {
  return () => undefined;
}

function getHydratedSnapshot(): boolean {
  return true;
}

function getServerSnapshot(): boolean {
  return false;
}

export function EventList({
  events,
  groupByDate = false,
  clearDraftOnLoad = false,
}: EventListProps) {
  const ready = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    if (clearDraftOnLoad) {
      clearRecordDraft();
    }
  }, [clearDraftOnLoad]);

  const groups = useMemo(() => {
    const byDate = new Map<string, EventRow[]>();
    for (const event of events) {
      const key = groupByDate ? localDateKey(event.occurredAt) : "recent";
      byDate.set(key, [...(byDate.get(key) ?? []), event]);
    }
    return [...byDate.entries()];
  }, [events, groupByDate]);

  if (!ready) {
    return <p className="muted">履歴を表示しています。</p>;
  }

  if (events.length === 0) {
    return <p className="muted">記録はまだありません。</p>;
  }

  return (
    <div className="event-groups">
      {groups.map(([date, dayEvents]) => (
        <section className="event-group" key={date}>
          {groupByDate ? <h2 className="date-heading">{formatLocalDate(dayEvents[0].occurredAt)}</h2> : null}
          <ul className="event-list">
            {dayEvents.map((event) => (
              <li className="event-row" key={event.id}>
                <time className="event-time" dateTime={event.occurredAt}>
                  {formatLocalTime(event.occurredAt)}
                </time>
                <span className="event-type">{typeLabels[event.type]}</span>
                <span className="event-label">{event.label}</span>
                {event.severity !== null ? (
                  <span className="event-severity">{event.severity}/10</span>
                ) : null}
                <Link
                  className="event-edit-link"
                  href={`/events/${event.id}/edit`}
                  aria-label={`${event.label}の記録を編集`}
                >
                  編集
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
