function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function localDateTimeToIso(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new Error("日時を確認してください");
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || formatLocalDateTimeInput(date) !== value) {
    throw new Error("日時を確認してください");
  }

  return date.toISOString();
}

export function formatLocalDateTimeInput(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("日時を確認してください");
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function localDateKey(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("日時を確認してください");
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatLocalDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("日時を確認してください");
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatLocalTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("日時を確認してください");
  }

  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}
