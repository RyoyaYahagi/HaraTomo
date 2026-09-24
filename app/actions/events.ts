"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getEventRepository } from "@/lib/db/events";
import { extractEvents } from "@/lib/ai/extract";
import { createReviewDrafts } from "@/lib/ai/pipeline";
import { judgeEvent } from "@/lib/ai/jev";
import { eventInputSchema } from "@/lib/events/schema";
import { reviewDraftSchema } from "@/lib/ai/schema";

export type EventActionState = { error: string | null };

export type RecordingActionState = {
  error: string | null;
  candidates: import("@/lib/ai/schema").ReviewDraft[] | null;
};

export async function generateEventDraftsAction(
  _previousState: RecordingActionState,
  formData: FormData,
): Promise<RecordingActionState> {
  const rawText = String(formData.get("rawText") ?? "").trim();
  const today = String(formData.get("today") ?? "");
  if (!rawText) return { error: "記録内容を入力してください。", candidates: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    return { error: "日付を確認して、もう一度お試しください。", candidates: null };
  }

  try {
    const candidates = await createReviewDrafts(rawText, today, {
      extract: extractEvents,
      judge: judgeEvent,
    });
    if (candidates.length === 0) {
      return {
        error: "記録できる候補が見つかりませんでした。入力した文章は保持されています。手動で記録できます。",
        candidates: null,
      };
    }
    return { error: null, candidates: candidates.map((candidate) => reviewDraftSchema.parse(candidate)) };
  } catch {
    return {
      error: "内容を整理できませんでした。入力した文章は保持されています。手動で記録できます。",
      candidates: null,
    };
  }
}

export async function createEventsAction(
  _previousState: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const rawText = String(formData.get("rawText") ?? "");
  let submitted: unknown;
  try {
    submitted = JSON.parse(String(formData.get("events") ?? ""));
  } catch {
    return { error: "候補を読み取れませんでした。内容を確認してください。" };
  }

  const events = Array.isArray(submitted) ? submitted : [];
  if (events.length === 0) return { error: "保存する候補を1件以上残してください。" };
  const parsed = events.map((event) => eventInputSchema.safeParse({ ...event, rawText }));
  if (parsed.some((result) => !result.success)) {
    return { error: "日時や内容を確認してください。入力した内容は残っています。" };
  }

  try {
    getEventRepository().createMany(parsed.map((result) => result.data));
  } catch {
    return { error: "記録を保存できませんでした。入力した内容は残っています。" };
  }

  revalidatePath("/");
  revalidatePath("/timeline");
  redirect("/timeline?created=1");
}

function eventInputFromForm(formData: FormData) {
  const severity = String(formData.get("severity") ?? "");
  const optionalText = (name: string) => {
    const value = String(formData.get(name) ?? "");
    return value.trim() ? value : null;
  };

  return {
    type: String(formData.get("type") ?? ""),
    occurredAt: String(formData.get("occurredAt") ?? ""),
    label: String(formData.get("label") ?? ""),
    normalizedLabel: optionalText("normalizedLabel"),
    severity: severity === "" ? null : Number(severity),
    note: optionalText("note"),
    rawText: optionalText("rawText"),
  };
}

function isValidForm(formData: FormData): boolean {
  return eventInputSchema.safeParse(eventInputFromForm(formData)).success;
}

export async function createEventAction(
  _previousState: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  if (!isValidForm(formData)) {
    return { error: "入力内容を確認してください。" };
  }

  try {
    getEventRepository().create(eventInputFromForm(formData));
  } catch {
    return { error: "記録を保存できませんでした。入力した内容は残っています。" };
  }

  revalidatePath("/");
  revalidatePath("/timeline");
  redirect("/timeline?created=1");
}

export async function updateEventAction(
  id: number,
  _previousState: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  if (!isValidForm(formData)) {
    return { error: "入力内容を確認してください。" };
  }

  try {
    if (!getEventRepository().update(id, eventInputFromForm(formData))) {
      return { error: "この記録は見つかりませんでした。" };
    }
  } catch {
    return { error: "記録を保存できませんでした。入力した内容は残っています。" };
  }

  revalidatePath("/");
  revalidatePath("/timeline");
  redirect("/timeline?updated=1");
}

export async function deleteEventAction(id: number): Promise<EventActionState> {
  try {
    if (!getEventRepository().delete(id)) {
      return { error: "この記録は見つかりませんでした。" };
    }
  } catch {
    return { error: "記録を削除できませんでした。時間をおいて再度お試しください。" };
  }

  revalidatePath("/");
  revalidatePath("/timeline");
  redirect("/timeline?deleted=1");
}
