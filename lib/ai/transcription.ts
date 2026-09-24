import "server-only";

import { GoogleGenAI } from "@google/genai";
import { transcribeUploadedAudio, type TranscriptionResult } from "./transcription-core";

export async function transcribeAudio(audio: Blob, mimeType: string): Promise<TranscriptionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini is not configured");

  const client = new GoogleGenAI({ apiKey });
  return transcribeUploadedAudio(client, audio, mimeType);
}
