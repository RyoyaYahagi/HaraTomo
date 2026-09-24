"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { createEventsAction, type EventActionState } from "@/app/actions/events";
import type { ReviewDraft } from "@/lib/ai/schema";
import { localDateTimeToIso } from "@/lib/events/datetime";
import { eventTypes } from "@/lib/events/schema";

const typeLabels: Record<(typeof eventTypes)[number], string> = {
  meal: "食事",
  symptom: "症状",
  context: "生活",
  other: "その他",
};

const normalizedLabelOptions: Record<(typeof eventTypes)[number], Record<string, string>> = {
  meal: {},
  symptom: {
    abdominal_pain: "腹痛",
    diarrhea: "下痢",
    constipation: "便秘",
    bloating: "膨満感",
    gas: "ガス",
    nausea: "吐き気",
    indigestion: "消化不良",
    bowel_sound: "腸の音",
  },
  context: {
    cold_exposure: "冷え",
    lack_of_sleep: "睡眠不足",
    stress: "ストレス",
    exercise: "運動",
    alcohol: "飲酒",
    caffeine: "カフェイン",
  },
  other: {},
};

const initialSaveState: EventActionState = { error: null };

export function EventConfirmation({
  rawText,
  initialCandidates,
}: {
  rawText: string;
  initialCandidates: ReviewDraft[];
}) {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [state, saveAction, isSaving] = useActionState(createEventsAction, initialSaveState);
  const [payload, payloadError] = useMemo(() => {
    try {
      const events = candidates.map((candidate) => ({
        type: candidate.type,
        occurredAt: localDateTimeToIso(`${candidate.date}T${candidate.time}`),
        label: candidate.label,
        normalizedLabel: candidate.normalizedLabel || null,
        severity: candidate.type === "symptom" ? candidate.severity : null,
        note: candidate.note || null,
      }));
      return [JSON.stringify(events), null] as const;
    } catch {
      return ["[]", "日時を確認してください。時刻が不明な候補には、記録したい時刻を入力してください。"] as const;
    }
  }, [candidates]);

  function updateCandidate(index: number, patch: Partial<ReviewDraft>) {
    setCandidates((current) =>
      current.map((candidate, candidateIndex) =>
        candidateIndex === index
          ? {
              ...candidate,
              ...patch,
              normalizedLabel:
                patch.type && patch.type !== candidate.type
                  ? ""
                  : patch.normalizedLabel ?? candidate.normalizedLabel,
              severity:
                patch.type && patch.type !== "symptom"
                  ? null
                  : patch.severity === undefined
                    ? candidate.severity
                    : patch.severity,
            }
          : candidate,
      ),
    );
  }

  return (
    <section className="confirmation-section" aria-labelledby="confirmation-heading">
      <h1 id="confirmation-heading">記録候補を確認</h1>
      <details className="source-text">
        <summary>最初に入力した内容</summary>
        <p>{rawText}</p>
      </details>

      <p className="muted">AIが整理した候補です。内容を確認してから保存してください。</p>
      <form action={saveAction} className="confirmation-form">
        <input type="hidden" name="events" value={payload} />
        <input type="hidden" name="rawText" value={rawText} />
        <ul className="candidate-list">
          {candidates.map((candidate, index) => (
            <li className="candidate-row" key={`${index}-${candidate.label}`}>
              <details open={candidate.needsClarification}>
                <summary className="candidate-summary">
                  <span>{candidate.time || "時刻を入力"}</span>
                  <span>{typeLabels[candidate.type]}</span>
                  <span>{candidate.label}</span>
                  {candidate.needsClarification ? <span className="candidate-attention">AIが確認を求めました</span> : null}
                </summary>
                <div className="candidate-details">
                  <p className="candidate-source-status">
                    {candidate.supportedBySource === null
                      ? "AIは元の入力文との照合を完了できませんでした。"
                      : candidate.supportedBySource
                        ? "AIは元の入力文にある内容だと判断しました。"
                        : "AIは元の入力文との照合が必要だと判断しました。"}
                  </p>
                  <div className="candidate-fields">
                    <div className="field">
                      <label htmlFor={`date-${index}`}>日付</label>
                      <input
                        id={`date-${index}`}
                        type="date"
                        required
                        value={candidate.date}
                        onChange={(event) => updateCandidate(index, { date: event.currentTarget.value })}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`time-${index}`}>時刻</label>
                      <input
                        id={`time-${index}`}
                        type="time"
                        required
                        value={candidate.time}
                        onChange={(event) => updateCandidate(index, { time: event.currentTarget.value })}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`type-${index}`}>種類</label>
                      <select
                        id={`type-${index}`}
                        value={candidate.type}
                        onChange={(event) =>
                          updateCandidate(index, { type: event.currentTarget.value as ReviewDraft["type"] })
                        }
                      >
                        {eventTypes.map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor={`label-${index}`}>内容</label>
                      <input
                        id={`label-${index}`}
                        type="text"
                        maxLength={160}
                        required
                        value={candidate.label}
                        onChange={(event) => updateCandidate(index, { label: event.currentTarget.value })}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`normalized-${index}`}>分類名（任意）</label>
                      <select
                        id={`normalized-${index}`}
                        value={candidate.normalizedLabel}
                        onChange={(event) => updateCandidate(index, { normalizedLabel: event.currentTarget.value })}
                      >
                        <option value="">分類なし</option>
                        {Object.entries(normalizedLabelOptions[candidate.type]).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    {candidate.type === "symptom" || candidate.severity !== null ? (
                      <div className="field">
                        <label htmlFor={`severity-${index}`}>症状の強さ（0〜10、任意）</label>
                        <input
                          id={`severity-${index}`}
                          type="number"
                          min="0"
                          max="10"
                          step="1"
                          value={candidate.severity ?? ""}
                          onChange={(event) =>
                            updateCandidate(index, {
                              severity: event.currentTarget.value === "" ? null : Number(event.currentTarget.value),
                            })
                          }
                        />
                      </div>
                    ) : null}
                    <div className="field">
                      <label htmlFor={`note-${index}`}>補足（任意）</label>
                      <textarea
                        id={`note-${index}`}
                        rows={2}
                        value={candidate.note}
                        onChange={(event) => updateCandidate(index, { note: event.currentTarget.value })}
                      />
                    </div>
                  </div>
                  <button
                    className="button button-secondary candidate-remove"
                    type="button"
                    onClick={() => setCandidates((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    この候補を除外
                  </button>
                </div>
              </details>
            </li>
          ))}
        </ul>

        {candidates.length === 0 ? <p className="muted">保存する候補がありません。</p> : null}
        {payloadError || state.error ? (
          <p className="form-error" role="alert">{payloadError ?? state.error}</p>
        ) : null}
        <button
          className="button button-primary"
          type="submit"
          disabled={isSaving || candidates.length === 0 || Boolean(payloadError)}
        >
          {isSaving ? "保存中…" : "この内容で保存"}
        </button>
        <Link className="text-link confirmation-manual-link" href="/events/new">手動入力で記録する</Link>
      </form>
    </section>
  );
}
