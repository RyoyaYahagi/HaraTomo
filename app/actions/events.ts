"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getEventRepository } from "@/lib/db/events";
import { eventInputSchema } from "@/lib/events/schema";

export type EventActionState = { error: string | null };

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
