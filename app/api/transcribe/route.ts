import { NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/ai/transcription";
import { MAX_AUDIO_BYTES, validateAudioInput } from "@/lib/ai/audio-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_AUDIO_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "音声データが大きすぎます。録音を短くしてもう一度お試しください。" }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "録音データを読み取れませんでした。もう一度お試しください。" }, { status: 400 });
  }

  const audio = formData.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "録音データが見つかりません。もう一度録音してください。" }, { status: 400 });
  }
  const mimeType = audio.type.split(";")[0].trim().toLowerCase();
  const validationError = validateAudioInput(audio, mimeType);
  if (validationError === "empty") {
    return NextResponse.json({ error: "録音に音声がありません。もう一度録音してください。" }, { status: 400 });
  }
  if (validationError === "too-large") {
    return NextResponse.json({ error: "音声データが大きすぎます。録音を短くしてもう一度お試しください。" }, { status: 413 });
  }
  if (validationError === "unsupported-type") {
    return NextResponse.json({ error: "このブラウザーの録音形式には対応していません。" }, { status: 415 });
  }

  try {
    const result = await transcribeAudio(audio, mimeType);
    return NextResponse.json({
      transcript: result.transcript,
      warning: result.cleanupWarning
        ? "文字起こしはできましたが、一時音声の削除を確認できませんでした。Gemini上に残っている可能性があります。"
        : null,
    });
  } catch (cause) {
    const cleanupWarning = cause instanceof Error && "cleanupWarning" in cause && cause.cleanupWarning === true
      ? "一時音声の削除を確認できませんでした。Gemini上に残っている可能性があります。"
      : null;
    return NextResponse.json({
      error: "文字起こしに失敗しました。入力文は保持されています。必要なら再録音してください。",
      warning: cleanupWarning,
    }, { status: 502 });
  }
}
