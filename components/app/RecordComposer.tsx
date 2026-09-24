"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore, type FormEvent } from "react";
import { EventList } from "./EventList";
import type { EventRow } from "@/lib/db/schema";
import {
  getEmptyRecordDraft,
  getRecordDraft,
  saveRecordDraft,
  subscribeToRecordDraft,
} from "@/lib/events/draft";

export function RecordComposer({ recentEvents }: { recentEvents: EventRow[] }) {
  const router = useRouter();
  const draft = useSyncExternalStore(
    subscribeToRecordDraft,
    getRecordDraft,
    getEmptyRecordDraft,
  );

  function handleChange(value: string) {
    saveRecordDraft(value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) return;
    router.push("/events/new");
  }

  return (
    <>
      <section aria-labelledby="record-heading" className="record-section">
        <h1 id="record-heading">今日どうだった？</h1>
        <p className="muted">食事や体調を、思い出した言葉のまま書けます。</p>
        <form className="record-form" onSubmit={handleSubmit}>
          <label className="visually-hidden" htmlFor="record-draft">
            今日の食事や体調
          </label>
          <textarea
            id="record-draft"
            rows={5}
            placeholder="昼にラーメン。夕方冷えて、20時に腹痛…"
            value={draft}
            onChange={(event) => handleChange(event.currentTarget.value)}
          />
          <button className="button button-primary" type="submit" disabled={!draft.trim()}>
            記録する
          </button>
        </form>
      </section>

      <section aria-labelledby="recent-heading" className="recent-section">
        <h2 id="recent-heading">最近の記録</h2>
        <EventList events={recentEvents} groupByDate />
      </section>
    </>
  );
}
