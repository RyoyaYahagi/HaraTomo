import "server-only";

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { geminiExtractionOutputSchema } from "./schema";

const GEMINI_MODEL = "gemini-3.8-flash";

export async function extractEvents(rawText: string, today: string): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini is not configured");

  const responseJsonSchema = z.toJSONSchema(geminiExtractionOutputSchema);
  delete responseJsonSchema.$schema;
  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: `Extract distinct food, symptom, and life-context events from the user's note. Do not infer causes or add facts. Keep each original label. Use rawType values meal, symptom, context, or other when clear; otherwise null. Resolve relative dates against today's local date (${today}). Return date as YYYY-MM-DD only when the input contains a date; return null if it has no date. Return time as exact 24-hour HH:mm only when stated unambiguously. For missing, approximate, or ambiguous times return null. Use severity only when the user explicitly states symptom intensity on a 0-10 scale. Put other explicitly stated detail in note; otherwise null. Return an empty list only when there are no recordable events.\n\nUser note:\n${rawText}`,
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseJsonSchema,
    },
  });

  if (!response.text) throw new Error("Gemini returned no text");
  return geminiExtractionOutputSchema.parse(JSON.parse(response.text));
}
