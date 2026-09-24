"use client";

import { useEffect, useRef, useState } from "react";

const MAX_RECORDING_SECONDS = 60;

type VoiceInputProps = {
  disabled?: boolean;
  onBusyChange: (busy: boolean) => void;
  onTranscript: (transcript: string) => void;
};

export function VoiceInput({ disabled = false, onBusyChange, onTranscript }: VoiceInputProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(false);
  const generationRef = useRef(0);
  const startedAtRef = useRef(0);
  const [state, setState] = useState<"idle" | "requesting" | "recording" | "transcribing">("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      abortControllerRef.current?.abort();
      if (timeoutRef.current) clearInterval(timeoutRef.current);
      if (recorderRef.current) {
        recorderRef.current.onstop = null;
        recorderRef.current.ondataavailable = null;
        if (recorderRef.current.state === "recording") recorderRef.current.stop();
        recorderRef.current = null;
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      chunksRef.current = [];
      blobRef.current = null;
    };
  }, []);

  async function startRecording() {
    const generation = ++generationRef.current;
    setError(null);
    setWarning(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("このブラウザーではマイク録音を利用できません。");
      return;
    }

    setState("requesting");
    onBusyChange(true);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (cause) {
      if (!mountedRef.current || generation !== generationRef.current) return;
      const errorName = cause instanceof DOMException ? cause.name : "";
      setError(errorName === "NotAllowedError" || errorName === "SecurityError"
        ? "マイクの使用が許可されていません。ブラウザーの設定をご確認ください。"
        : errorName === "NotFoundError" || errorName === "DevicesNotFoundError"
          ? "利用できるマイクが見つかりません。"
          : "マイクを開始できませんでした。もう一度お試しください。");
      setState("idle");
      onBusyChange(false);
      return;
    }

    if (!mountedRef.current || generation !== generationRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]
      .find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType) {
      stream.getTracks().forEach((track) => track.stop());
      setError("このブラウザーの録音形式には対応していません。");
      setState("idle");
      onBusyChange(false);
      return;
    }

    try {
      const recorder = new MediaRecorder(stream, { mimeType });
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      setSeconds(0);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        if (timeoutRef.current) clearInterval(timeoutRef.current);
        timeoutRef.current = null;
        recorder.onstop = null;
        chunksRef.current = [];
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (mountedRef.current && generation === generationRef.current) {
          setState("idle");
          onBusyChange(false);
          setError("録音に失敗しました。もう一度お試しください。");
        }
      };
      recorder.onstop = () => { void submitRecording(recorder.mimeType || mimeType, generation); };
      recorder.start();
      setState("recording");
      timeoutRef.current = setInterval(() => {
        const elapsed = Math.min(MAX_RECORDING_SECONDS, Math.floor((Date.now() - startedAtRef.current) / 1000));
        setSeconds(elapsed);
        if (elapsed >= MAX_RECORDING_SECONDS) stopRecording();
      }, 250);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setError("録音を開始できませんでした。もう一度お試しください。");
      setState("idle");
      onBusyChange(false);
    }
  }

  function stopRecording() {
    if (timeoutRef.current) clearInterval(timeoutRef.current);
    timeoutRef.current = null;
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      setState("transcribing");
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function submitRecording(mimeType: string, generation: number) {
    const chunks = chunksRef.current;
    chunksRef.current = [];
    let blob: Blob | null = new Blob(chunks, { type: mimeType });
    blobRef.current = blob;
    recorderRef.current = null;

    if (!blob.size) {
      blobRef.current = null;
      setState("idle");
      onBusyChange(false);
      setError("録音に音声がありません。もう一度録音してください。");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording");
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const response = await fetch("/api/transcribe", { method: "POST", body: formData, signal: controller.signal });
      const result = await response.json().catch(() => ({})) as { transcript?: string; error?: string; warning?: string | null };
      if (!mountedRef.current || generation !== generationRef.current) return;
      if (!response.ok || !result.transcript?.trim()) {
        setWarning(result.warning ?? null);
        setError(result.error ?? "文字起こしに失敗しました。入力文は保持されています。必要なら再録音してください。");
        return;
      }
      onTranscript(result.transcript.trim());
      setError(null);
      setWarning(result.warning ?? null);
    } catch {
      if (mountedRef.current && generation === generationRef.current) {
        setError("文字起こしに失敗しました。入力文は保持されています。必要なら再録音してください。");
      }
    } finally {
      blob = null;
      blobRef.current = null;
      if (abortControllerRef.current?.signal.aborted || generation === generationRef.current) {
        abortControllerRef.current = null;
      }
      if (mountedRef.current && generation === generationRef.current) {
        setState("idle");
        onBusyChange(false);
      }
    }
  }

  return (
    <div className="voice-input">
      {state === "requesting" ? (
        <p className="muted" role="status" aria-live="polite">マイクを準備しています…</p>
      ) : state === "recording" ? (
        <div className="voice-status">
          <span role="status" aria-live="polite">録音中 {seconds}秒 / {MAX_RECORDING_SECONDS}秒</span>
          <button className="text-button" type="button" onClick={stopRecording}>録音を停止</button>
        </div>
      ) : state === "transcribing" ? (
        <p className="muted" role="status" aria-live="polite">文字起こし中…</p>
      ) : (
        <button className="text-button" type="button" onClick={() => void startRecording()} disabled={disabled}>
          音声で入力
        </button>
      )}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {warning ? <p className="muted" role="status">{warning}</p> : null}
    </div>
  );
}
