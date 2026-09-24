import assert from "node:assert/strict";
import test from "node:test";
import { MAX_AUDIO_BYTES, validateAudioInput } from "../lib/ai/audio-validation";
import { TranscriptionFailure, transcribeUploadedAudio, type TranscriptionClient } from "../lib/ai/transcription-core";
import { appendTranscriptToDraft } from "../lib/events/draft";

function clientFixture(overrides: {
  upload?: TranscriptionClient["files"]["upload"];
  create?: TranscriptionClient["interactions"]["create"];
  delete?: TranscriptionClient["files"]["delete"];
} = {}) {
  const calls: string[] = [];
  const client: TranscriptionClient = {
    files: {
      upload: overrides.upload ?? (async () => {
        calls.push("upload");
        return { name: "files/temporary", uri: "https://gemini.invalid/file", mimeType: "audio/webm" };
      }),
      delete: overrides.delete ?? (async () => { calls.push("delete"); }),
    },
    interactions: {
      create: overrides.create ?? (async (params) => {
        const config = params.generation_config.transcription_config;
        calls.push(`transcribe:${params.model}:${config.mode.type}:${config.language_codes.join(",")}`);
        return { output_text: "  昼にうどんを食べた。  " };
      }),
    },
  };
  return { client, calls };
}

test("audio input validation rejects missing, empty, unsupported and oversized audio", () => {
  assert.equal(validateAudioInput(null, "audio/webm"), "missing");
  assert.equal(validateAudioInput(new Blob([]), "audio/webm"), "empty");
  assert.equal(validateAudioInput(new Blob(["x"], { type: "audio/wav" }), "audio/wav"), "unsupported-type");
  assert.equal(validateAudioInput(new Blob([new Uint8Array(MAX_AUDIO_BYTES + 1)]), "audio/webm"), "too-large");
  assert.equal(validateAudioInput(new Blob(["x"]), "audio/webm"), null);
});

test("transcription returns verbatim text and deletes the remote upload", async () => {
  const { client, calls } = clientFixture();
  const result = await transcribeUploadedAudio(client, new Blob(["audio"]), "audio/webm");
  assert.equal(result.transcript, "昼にうどんを食べた。");
  assert.equal(result.cleanupWarning, false);
  assert.deepEqual(calls, ["upload", "transcribe:gemini-3.5-transcribe:verbatim:ja-JP", "delete"]);
});

test("transcription failure still attempts remote cleanup and preserves the provider error", async () => {
  const { client, calls } = clientFixture({
    create: async () => { calls.push("transcribe"); throw new Error("provider failed"); },
  });
  await assert.rejects(transcribeUploadedAudio(client, new Blob(["audio"]), "audio/webm"), /provider failed/);
  assert.deepEqual(calls, ["upload", "transcribe", "delete"]);
});

test("transcription and remote cleanup failures are both reported without exposing a file name", async () => {
  const { client } = clientFixture({
    create: async () => { throw new Error("provider failed"); },
    delete: async () => { throw new Error("cleanup failed"); },
  });
  await assert.rejects(
    transcribeUploadedAudio(client, new Blob(["audio"]), "audio/webm"),
    (error: unknown) => error instanceof TranscriptionFailure && error.message === "provider failed" && error.cleanupWarning,
  );
});

test("remote cleanup failure does not discard successful transcription", async () => {
  const { client } = clientFixture({ delete: async () => { throw new Error("cleanup failed"); } });
  const result = await transcribeUploadedAudio(client, new Blob(["audio"]), "audio/webm");
  assert.equal(result.transcript, "昼にうどんを食べた。");
  assert.equal(result.cleanupWarning, true);
});

test("incomplete upload metadata still triggers deletion and reports an unconfirmed cleanup", async () => {
  const { client, calls } = clientFixture({
    upload: async () => { calls.push("upload"); return { name: "files/temporary" }; },
    delete: async () => { calls.push("delete"); throw new Error("cleanup failed"); },
  });
  await assert.rejects(
    transcribeUploadedAudio(client, new Blob(["audio"]), "audio/webm"),
    (error: unknown) => error instanceof TranscriptionFailure && error.cleanupWarning,
  );
  assert.deepEqual(calls, ["upload", "delete"]);
});

test("transcription appends to an existing text draft without replacing it", () => {
  assert.equal(appendTranscriptToDraft("昼にカレー。", "夕方にお腹が痛い"), "昼にカレー。\n夕方にお腹が痛い");
  assert.equal(appendTranscriptToDraft("昼にカレー。\n", "夕方にお腹が痛い"), "昼にカレー。\n夕方にお腹が痛い");
});
