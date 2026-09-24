"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  createEventAction,
  deleteEventAction,
  updateEventAction,
  type EventActionState,
} from "@/app/actions/events";
import type { EventRow } from "@/lib/db/schema";
import { formatLocalDateTimeInput, localDateTimeToIso } from "@/lib/events/datetime";
import {
  getEmptyRecordDraft,
  getRecordDraft,
  saveRecordDraft,
  subscribeToRecordDraft,
} from "@/lib/events/draft";
import { eventTypes } from "@/lib/events/schema";

const initialActionState: EventActionState = { error: null };

const typeLabels: Record<(typeof eventTypes)[number], string> = {
  meal: "食事",
  symptom: "症状",
  context: "生活",
  other: "その他",
};

type EventEditorProps = {
  event?: EventRow;
};

export function EventEditor({ event }: EventEditorProps) {
  const router = useRouter();
  const persistedDraft = useSyncExternalStore(
    subscribeToRecordDraft,
    getRecordDraft,
    getEmptyRecordDraft,
  );
  const [occurredAtLocal, setOccurredAtLocal] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [type, setType] = useState<(typeof eventTypes)[number] | "">(event?.type ?? "");
  const [label, setLabel] = useState(event?.label ?? "");
  const [normalizedLabel, setNormalizedLabel] = useState(event?.normalizedLabel ?? "");
  const [severity, setSeverity] = useState(event?.severity?.toString() ?? "");
  const [note, setNote] = useState(event?.note ?? "");
  const [rawText, setRawText] = useState(event?.rawText ?? "");
  const [rawTextEdited, setRawTextEdited] = useState(false);
  const rawTextValue = !event && !rawTextEdited ? persistedDraft : rawText;
  const eventId = event?.id;
  const formActionHandler = useMemo(
    () => (eventId === undefined ? createEventAction : updateEventAction.bind(null, eventId)),
    [eventId],
  );
  const [state, formAction, isPending] = useActionState(formActionHandler, initialActionState);
  const eventOccurredAt = event?.occurredAt;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const initialTime = eventOccurredAt
        ? formatLocalDateTimeInput(eventOccurredAt)
        : formatLocalDateTimeInput(new Date());
      setOccurredAtLocal(initialTime);
      setOccurredAt(localDateTimeToIso(initialTime));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [eventId, eventOccurredAt]);

  function handleTimeChange(value: string) {
    setOccurredAtLocal(value);
    try {
      setOccurredAt(localDateTimeToIso(value));
    } catch {
      setOccurredAt("");
    }
  }

  async function handleDelete() {
    if (!event || !window.confirm("この記録を削除しますか？")) return;
    await deleteEventAction(event.id);
  }

  return (
    <>
      <form action={formAction} className="event-form">
        <div className="field">
          <label htmlFor="occurredAtLocal">日時</label>
          <input
            id="occurredAtLocal"
            name="occurredAtLocal"
            type="datetime-local"
            required
            value={occurredAtLocal}
            onChange={(eventChange) => handleTimeChange(eventChange.currentTarget.value)}
          />
          <input type="hidden" name="occurredAt" value={occurredAt} />
        </div>

        <div className="field">
          <label htmlFor="type">種類</label>
          <select
            id="type"
            name="type"
            required
            value={type}
            onChange={(eventChange) =>
              setType(eventChange.currentTarget.value as (typeof eventTypes)[number] | "")
            }
          >
            <option value="" disabled>
              種類を選択
            </option>
            {eventTypes.map((eventType) => (
              <option key={eventType} value={eventType}>
                {typeLabels[eventType]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="label">内容</label>
          <input
            id="label"
            name="label"
            type="text"
            required
            maxLength={160}
            value={label}
            onChange={(eventChange) => setLabel(eventChange.currentTarget.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="normalizedLabel">分類名（任意）</label>
          <input
            id="normalizedLabel"
            name="normalizedLabel"
            type="text"
            value={normalizedLabel}
            onChange={(eventChange) => setNormalizedLabel(eventChange.currentTarget.value)}
          />
        </div>

        {type === "symptom" ? (
          <div className="field">
            <label htmlFor="severity">症状の強さ（0〜10）</label>
            <input
              id="severity"
              name="severity"
              type="number"
              min="0"
              max="10"
              step="1"
              value={severity}
              onChange={(eventChange) => setSeverity(eventChange.currentTarget.value)}
            />
          </div>
        ) : (
          <input type="hidden" name="severity" value="" />
        )}

        <div className="field">
          <label htmlFor="note">補足</label>
          <textarea
            id="note"
            name="note"
            rows={3}
            value={note}
            onChange={(eventChange) => setNote(eventChange.currentTarget.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="rawText">最初に書いた内容</label>
          <textarea
            id="rawText"
            name="rawText"
            rows={4}
            value={rawTextValue}
            onChange={(eventChange) => {
              const value = eventChange.currentTarget.value;
              setRawText(value);
              setRawTextEdited(true);
              if (!event) {
                saveRecordDraft(value);
              }
            }}
          />
        </div>

        {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}

        <button className="button button-primary" type="submit" disabled={isPending || !occurredAt}>
          {isPending ? "保存中…" : "保存"}
        </button>
      </form>

      {event ? (
        <div className="edit-actions">
          <Link className="text-link" href="/timeline">
            履歴へ戻る
          </Link>
          <button className="button button-danger" type="button" onClick={handleDelete}>
            削除
          </button>
        </div>
      ) : (
        <div className="edit-actions">
          <button className="button button-secondary" type="button" onClick={() => router.back()}>
            戻る
          </button>
        </div>
      )}
    </>
  );
}
