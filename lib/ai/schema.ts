import { z } from "zod";
import {
  contextNormalizationLabels,
  eventTypes,
  symptomNormalizationLabels,
} from "../events/schema";

const localDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  });

const localTimeSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);

const extractedEventOutputSchema = z
  .object({
    rawType: z.enum(eventTypes).nullable(),
    date: z.string().nullable(),
    time: z.string().nullable(),
    label: z.string(),
    severity: z.number().int().min(0).max(10).nullable(),
    note: z.string().nullable(),
  })
  .strict();

export const geminiExtractionOutputSchema = z.object({
  events: z.array(extractedEventOutputSchema).max(20),
});

export const extractedEventSchema = z
  .object({
    rawType: z.enum(eventTypes).nullable(),
    date: localDateSchema.nullable(),
    time: localTimeSchema.nullable(),
    label: z.string().trim().min(1),
    severity: z.number().int().min(0).max(10).nullable(),
    note: z.string().nullable(),
  })
  .strict();

export const extractionResponseSchema = z.object({
  events: z.array(extractedEventSchema).max(20),
});

export const jevDecisionSchema = z
  .object({
    type: z.enum(eventTypes),
    normalizedLabel: z.string().nullable(),
    supportedBySource: z.boolean(),
    needsClarification: z.boolean(),
  })
  .superRefine((decision, context) => {
    if (decision.normalizedLabel === null) return;
    const valid =
      decision.type === "symptom"
        ? symptomNormalizationLabels.includes(decision.normalizedLabel as (typeof symptomNormalizationLabels)[number])
        : decision.type === "context"
          ? contextNormalizationLabels.includes(decision.normalizedLabel as (typeof contextNormalizationLabels)[number])
          : false;
    if (!valid) {
      context.addIssue({
        code: "custom",
        path: ["normalizedLabel"],
        message: "Normalized label must match the selected event type",
      });
    }
  });

export const reviewDraftSchema = z.object({
  type: z.enum(eventTypes),
  date: localDateSchema,
  time: z.union([localTimeSchema, z.literal("")]),
  label: z.string().trim().min(1).max(160),
  normalizedLabel: z.string(),
  severity: z.number().int().min(0).max(10).nullable(),
  note: z.string(),
  supportedBySource: z.boolean().nullable(),
  needsClarification: z.boolean(),
});

export type ExtractedEvent = z.infer<typeof extractedEventSchema>;
export type ExtractionResponse = z.infer<typeof extractionResponseSchema>;
export type JevDecision = z.infer<typeof jevDecisionSchema>;

export type ReviewDraft = {
  type: (typeof eventTypes)[number];
  date: string;
  time: string;
  label: string;
  normalizedLabel: string;
  severity: number | null;
  note: string;
  supportedBySource: boolean | null;
  needsClarification: boolean;
};
