export type TranscriptionClient = {
  files: {
    upload(params: { file: Blob; config: { mimeType: string } }): Promise<{ name?: string; uri?: string; mimeType?: string }>;
    delete(params: { name: string }): Promise<unknown>;
  };
  interactions: {
    create(params: {
      model: string;
      input: { type: "audio"; uri: string; mime_type: string }[];
      generation_config: {
        transcription_config: {
          language_codes: string[];
          mode: { type: "verbatim" };
        };
      };
    }): Promise<{ output_text?: string }>;
  };
};

export type TranscriptionResult = {
  transcript: string;
  cleanupWarning: boolean;
};

export class TranscriptionFailure extends Error {
  constructor(message: string, readonly cleanupWarning: boolean) {
    super(message);
    this.name = "TranscriptionFailure";
  }
}

const TRANSCRIPTION_MODEL = "gemini-3.5-transcribe";

export async function transcribeUploadedAudio(
  client: TranscriptionClient,
  audio: Blob,
  mimeType: string,
): Promise<TranscriptionResult> {
  const file = await client.files.upload({ file: audio, config: { mimeType } });
  if (!file.name || !file.uri || !file.mimeType) {
    const cleanupWarning = file.name ? await deleteTemporaryFile(client, file.name) : true;
    throw new TranscriptionFailure("Gemini did not return a usable uploaded file", cleanupWarning);
  }

  let transcript = "";
  let transcriptionError: unknown;
  let cleanupWarning = false;
  try {
    const response = await client.interactions.create({
      model: TRANSCRIPTION_MODEL,
      input: [{ type: "audio", uri: file.uri, mime_type: file.mimeType }],
      generation_config: { transcription_config: { language_codes: ["ja-JP"], mode: { type: "verbatim" } } },
    });
    transcript = response.output_text?.trim() ?? "";
    if (!transcript) transcriptionError = new Error("Gemini returned an empty transcription");
  } catch (error) {
    transcriptionError = error;
  } finally {
    cleanupWarning = await deleteTemporaryFile(client, file.name);
  }

  if (transcriptionError) {
    throw new TranscriptionFailure(
      transcriptionError instanceof Error ? transcriptionError.message : "Gemini transcription failed",
      cleanupWarning,
    );
  }
  return { transcript, cleanupWarning };
}

async function deleteTemporaryFile(client: TranscriptionClient, name: string): Promise<boolean> {
  try {
    await client.files.delete({ name });
    return false;
  } catch {
    // The caller reports that the temporary upload may still be present remotely.
    return true;
  }
}
