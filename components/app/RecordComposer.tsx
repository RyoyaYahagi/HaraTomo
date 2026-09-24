"use client";

import Link from "next/link";
import { useActionState, useState, useSyncExternalStore, type FormEvent } from "react";
import {
  generateEventDraftsAction,
  type RecordingActionState,
} from "@/app/actions/events";
import { EventConfirmation } from "./EventConfirmation";
import { EventList } from "./EventList";
import { VoiceInput } from "./VoiceInput";
import type { EventRow } from "@/lib/db/schema";
import {
  appendTranscriptToDraft,
  getEmptyRecordDraft,
  getRecordDraft,
  saveRecordDraft,
  subscribeToRecordDraft,
} from "@/lib/events/draft";

const initialRecordingState: RecordingActionState = { error: null, candidates: null };

function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function RecordComposer({ recentEvents }: { recentEvents: EventRow[] }) {
  const [state, processAction, isProcessing] = useActionState(
    generateEventDraftsAction,
    initialRecordingState,
  );
  const [isVoiceBusy, setIsVoiceBusy] = useState(false);
  const draft = useSyncExternalStore(
    subscribeToRecordDraft,
    getRecordDraft,
    getEmptyRecordDraft,
  );

  function handleChange(value: string) {
    saveRecordDraft(value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const todayInput = event.currentTarget.elements.namedItem("today");
    if (todayInput instanceof HTMLInputElement) todayInput.value = localToday();
  }

  return (
    <>
      {state.candidates ? (
        <>
          <EventConfirmation rawText={draft} initialCandidates={state.candidates} />
          <div className="edit-actions">
            <button className="button button-secondary" type="button" onClick={() => window.location.reload()}>
              入力を修正
            </button>
          </div>
        </>
      ) : (
        <section aria-labelledby="record-heading" className="record-section">
          <h1 id="record-heading">今日どうだった？</h1>
          <p className="muted">食事や体調を、思い出した言葉のまま書けます。</p>
          <form action={processAction} className="record-form" onSubmit={handleSubmit}>
            <label className="visually-hidden" htmlFor="record-draft">
              今日の食事や体調
            </label>
            <textarea
              id="record-draft"
              name="rawText"
              rows={5}
              readOnly={isProcessing}
              placeholder="昼にラーメン。夕方冷えて、20時に腹痛…"
              value={draft}
              onChange={(event) => handleChange(event.currentTarget.value)}
            />
            <VoiceInput
              disabled={isProcessing}
              onBusyChange={setIsVoiceBusy}
              onTranscript={(transcript) => handleChange(appendTranscriptToDraft(getRecordDraft(), transcript))}
            />
            <input type="hidden" name="today" defaultValue="" />
            {isProcessing ? (
              <div className="processing-message" role="status" aria-live="polite">
                <p>記録を整理しています…</p>
                <p className="source-preview">{draft}</p>
              </div>
            ) : null}
            {state.error ? (
              <div>
                <p className="form-error" role="alert">{state.error}</p>
                <Link className="text-link" href="/events/new">手動入力で記録する</Link>
              </div>
            ) : null}
            <button
              className="button button-primary"
              type="submit"
              disabled={!draft.trim() || isProcessing || isVoiceBusy}
            >
              {isProcessing ? "整理中…" : "記録する"}
            </button>
          </form>
        </section>
      )}

      <section aria-labelledby="recent-heading" className="recent-section">
        <h2 id="recent-heading">最近の記録</h2>
        <EventList events={recentEvents} groupByDate />
      </section>
    </>
  );
}
