export const RECORD_DRAFT_KEY = "haratomo:record-draft";
const RECORD_DRAFT_EVENT = "haratomo:record-draft-change";

export function subscribeToRecordDraft(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(RECORD_DRAFT_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(RECORD_DRAFT_EVENT, onChange);
  };
}

export function getRecordDraft(): string {
  return window.localStorage.getItem(RECORD_DRAFT_KEY) ?? "";
}

export function getEmptyRecordDraft(): string {
  return "";
}

export function saveRecordDraft(value: string): void {
  window.localStorage.setItem(RECORD_DRAFT_KEY, value);
  window.dispatchEvent(new Event(RECORD_DRAFT_EVENT));
}

export function clearRecordDraft(): void {
  window.localStorage.removeItem(RECORD_DRAFT_KEY);
  window.dispatchEvent(new Event(RECORD_DRAFT_EVENT));
}
