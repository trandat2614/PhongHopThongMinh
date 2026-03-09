"use client";

/**
 * useSTTRecorder — Unified STT orchestrator.
 *
 * Supports two modes driven by STTConfig:
 *  1. "browser"  — Web Speech API (zero backend, runs in Chrome/Edge/Safari)
 *  2. "server"   — AudioWorklet + WebSocket PCM16 streaming via useSocketSTT
 *
 * Both modes expose the same public API so the UI layer doesn't care which is active.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ConnectionStatus,
  TranscriptEntry,
  STTConfig,
} from "@/lib/stt-types";
import { DEFAULT_STT_CONFIG } from "@/lib/stt-types";
import { useSocketSTT } from "./use-socket-stt";

// ── Browser SpeechRecognition helpers ──

function getSpeechRecognition(): typeof SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const W = window as any;
  return W.SpeechRecognition ?? W.webkitSpeechRecognition ?? null;
}

// ── Hook ──

export function useSTTRecorder(configOverrides?: Partial<STTConfig>) {
  const [config, setConfig] = useState<STTConfig>({
    ...DEFAULT_STT_CONFIG,
    ...configOverrides,
  });

  // ── Browser mode state ──
  const [browserRecording, setBrowserRecording] = useState(false);
  const [browserStatus, setBrowserStatus] = useState<ConnectionStatus>("idle");
  const [browserTranscripts, setBrowserTranscripts] = useState<TranscriptEntry[]>([]);
  const [browserError, setBrowserError] = useState<string | null>(null);
  const [browserDuration, setBrowserDuration] = useState(0);
  const [browserAnalyser, setBrowserAnalyser] = useState<AnalyserNode | null>(null);

  const speechRecRef = useRef<SpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false);
  const idCounterRef = useRef(0);

  // ── Server mode — delegate to useSocketSTT ──
  const socket = useSocketSTT({
    wsUrl: config.wsUrl,
    language: config.language,
    audioConfig: {
      sampleRate: 16000,
      chunkIntervalMs: config.chunkIntervalMs,
      channels: 1,
    },
    roomId: config.roomId,
    roomPassword: config.roomPassword,
  });

  // ── Keep ref in sync ──
  useEffect(() => {
    isRecordingRef.current = browserRecording;
  }, [browserRecording]);

  // ── Browser mode cleanup ──
  const browserCleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (speechRecRef.current) {
      try {
        speechRecRef.current.onend = null;
        speechRecRef.current.onerror = null;
        speechRecRef.current.onresult = null;
        speechRecRef.current.abort();
      } catch { /* */ }
      speechRecRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setBrowserAnalyser(null);
    setBrowserDuration(0);
  }, []);

  // ── Browser mode: start ──
  const startBrowser = useCallback(async () => {
    setBrowserError(null);
    setBrowserStatus("connecting");

    const SRConstructor = getSpeechRecognition();
    if (!SRConstructor) {
      setBrowserError(
        "Your browser does not support Speech Recognition. Use Chrome, Edge, or Safari."
      );
      setBrowserStatus("error");
      return;
    }

    try {
      // Mic + analyser for visualizer
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      setBrowserAnalyser(analyser);

      const recognition = new SRConstructor();
      recognition.lang = config.language;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      speechRecRef.current = recognition;

      recognition.onstart = () => {
        setBrowserStatus("live");
        setBrowserRecording(true);
        const start = Date.now();
        timerRef.current = setInterval(() => {
          setBrowserDuration(Math.floor((Date.now() - start) / 1000));
        }, 1000);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;
          const isFinal = result.isFinal;
          const entryId = `sr-${i}`;

          const entry: TranscriptEntry = {
            id: entryId,
            text,
            timestamp: Date.now(),
            isFinal,
            language: config.language,
          };

          setBrowserTranscripts((prev) => {
            const idx = prev.findIndex((e) => e.id === entryId);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = entry;
              return updated;
            }
            return [...prev, entry];
          });
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "no-speech" || event.error === "aborted") return;
        setBrowserError(`Speech recognition error: ${event.error}`);
        setBrowserStatus("error");
      };

      recognition.onend = () => {
        if (isRecordingRef.current) {
          try { recognition.start(); } catch { /* */ }
        }
      };

      recognition.start();
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access denied. Please allow mic permissions."
          : err instanceof DOMException && err.name === "NotFoundError"
            ? "No microphone found. Please connect a microphone."
            : `Failed to start: ${err instanceof Error ? err.message : "Unknown error"}`;
      setBrowserError(msg);
      setBrowserStatus("error");
      browserCleanup();
    }
  }, [config.language, browserCleanup]);

  // ── Browser mode: stop ──
  const stopBrowser = useCallback(() => {
    setBrowserRecording(false);
    setBrowserStatus("idle");
    browserCleanup();
  }, [browserCleanup]);

  // ── Unified public API ──

  const isServerMode = config.mode === "server";

  const isRecording = isServerMode ? socket.isStreaming : browserRecording;
  const status: ConnectionStatus = isServerMode
    ? (socket.status === "streaming" ||
       socket.status === "result_partial" ||
       socket.status === "result_final" ||
       socket.status === "connected"
        ? "live"
        : socket.status === "connecting"
          ? "connecting"
          : socket.status === "error"
            ? "error"
            : "idle")
    : browserStatus;
  const transcripts = isServerMode ? socket.transcripts : browserTranscripts;
  const error = isServerMode ? socket.error : browserError;
  const duration = isServerMode ? socket.duration : browserDuration;
  const analyserNode = isServerMode ? socket.analyserNode : browserAnalyser;

  const toggleRecording = useCallback(() => {
    if (isServerMode) {
      socket.toggle();
    } else {
      if (browserRecording) {
        stopBrowser();
      } else {
        startBrowser();
      }
    }
  }, [isServerMode, socket, browserRecording, stopBrowser, startBrowser]);

  const clearTranscripts = useCallback(() => {
    if (isServerMode) {
      socket.clearTranscripts();
    } else {
      setBrowserTranscripts([]);
      idCounterRef.current = 0;
    }
  }, [isServerMode, socket]);

  const dismissError = useCallback(() => {
    if (isServerMode) {
      socket.dismissError();
    } else {
      setBrowserError(null);
      if (browserStatus === "error") setBrowserStatus("idle");
    }
  }, [isServerMode, socket, browserStatus]);

  // Update config helper
  const updateConfig = useCallback((patch: Partial<STTConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => browserCleanup();
  }, [browserCleanup]);

  return {
    // State
    isRecording,
    status,
    transcripts,
    error,
    duration,
    analyserNode,
    config,
    // Actions
    toggleRecording,
    clearTranscripts,
    dismissError,
    updateConfig,
  };
}
