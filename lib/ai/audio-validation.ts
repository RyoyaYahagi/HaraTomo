export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
export const ALLOWED_AUDIO_TYPES = new Set(["audio/webm", "audio/mp4", "audio/ogg"]);

export type AudioValidationError = "missing" | "empty" | "too-large" | "unsupported-type";

export function validateAudioInput(audio: Blob | null, mimeType: string): AudioValidationError | null {
  if (!audio) return "missing";
  if (!audio.size) return "empty";
  if (audio.size > MAX_AUDIO_BYTES) return "too-large";
  if (!ALLOWED_AUDIO_TYPES.has(mimeType)) return "unsupported-type";
  return null;
}
