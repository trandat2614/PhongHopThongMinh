"use client";

/**
 * useSocketSTT — WebSocket-based STT streaming hook.
 *
 * Manages the full lifecycle:
 *  connecting -> connected -> streaming -> result_partial / result_final -> error
 *
 * Uses the AudioWorklet pipeline from lib/audio-processor.ts to capture
 * 16-bit PCM chunks and send them over a WebSocket to the STT backend.
 *
 * Receives JSON messages from the server:
 *  { type: "partial",    text: "...", id?: "..." }
 *  { type: "transcript", text: "...", id?: "...", isFinal: true }
 *  { type: "error",      message: "..." }
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createAudioPipeline,
  type AudioPipeline,
  type AudioPipelineConfig,
} from "@/lib/audio-processor";

// ── Types ──

export type SocketSTTStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "streaming"
  | "result_partial"
  | "result_final"
  | "error";

export interface SocketTranscriptEntry {
  id: string;
  text: string;
  isFinal: boolean;
  timestamp: number;
  language: string;
  userId?: string;
  userName?: string;
}

export interface MeetingSummary {
  id: string;
  text: string;
  timestamp: number;
  /** e.g. "3-minute" | "final" */
  intervalLabel?: string;
}

export interface AIResponse {
  id: string;
  query: string;
  answer: string;
  timestamp: number;
}

interface ServerMessage {
  type: "transcript" | "partial" | "error" | "info" | "summary_update" | "ai_response";
  text?: string;
  id?: string;
  isFinal?: boolean;
  message?: string;
  /** For summary_update */
  summary?: string;
  intervalLabel?: string;
  /** For ai_response */
  query?: string;
  answer?: string;
}

interface UseSocketSTTOptions {
  /** WebSocket server URL */
  wsUrl: string;
  /** Language code sent to the server as a query param or header */
  language?: string;
  /** Audio pipeline config overrides */
  audioConfig?: Partial<AudioPipelineConfig>;
  /** Room ID for collaborative sessions */
  roomId?: string;
  /** Room password for authentication */
  roomPassword?: string;
  /** User display name */
  userName?: string;
}

// ── Close code map ──

const CLOSE_REASONS: Record<number, string> = {
  1001: "Server is going away.",
  1002: "Protocol error.",
  1003: "Unsupported data type.",
  1006: "Connection lost. The STT server may be unreachable or not running.",
  1011: "Unexpected server error.",
  1015: "TLS handshake failed.",
};

// ── Hook ──

export function useSocketSTT(options: UseSocketSTTOptions) {
  const { wsUrl, language = "vi-VN", audioConfig, roomId, roomPassword, userName } = options;

  const [status, setStatus] = useState<SocketSTTStatus>("idle");
  const [transcripts, setTranscripts] = useState<SocketTranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [duration, setDuration] = useState(0);
  const [summaries, setSummaries] = useState<MeetingSummary[]>([]);
  const [aiResponses, setAiResponses] = useState<AIResponse[]>([]);

  const socketRef = useRef<WebSocket | null>(null);
  const pipelineRef = useRef<AudioPipeline | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idCounterRef = useRef(0);
  const isStreamingRef = useRef(false);

  /** Tear down everything */
  const cleanup = useCallback(() => {
    isStreamingRef.current = false;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (pipelineRef.current) {
      pipelineRef.current.destroy();
      pipelineRef.current = null;
    }
    setAnalyserNode(null);

    if (socketRef.current) {
      const ws = socketRef.current;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, "Recording stopped");
      }
      socketRef.current = null;
    }

    setDuration(0);
  }, []);

  /** Start streaming */
  const start = useCallback(async () => {
    setError(null);
    setStatus("connecting");

    try {
      // 1. Build WebSocket URL with room params
      const params = new URLSearchParams();
      params.set("lang", language);
      if (roomId) params.set("room", roomId);
      if (roomPassword) params.set("password", roomPassword);
      if (userName) params.set("user", userName);
      
      const separator = wsUrl.includes("?") ? "&" : "?";
      const wsUrlWithParams = `${wsUrl}${separator}${params.toString()}`;
      
      const ws = new WebSocket(wsUrlWithParams);
      ws.binaryType = "arraybuffer";
      socketRef.current = ws;

      // Wait for the socket to open (or fail)
      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error("WebSocket connection failed"));
        // Timeout after 8 seconds
        setTimeout(() => reject(new Error("Connection timeout")), 8000);
      });

      setStatus("connected");

      // 2. Set up message handling
      ws.onmessage = (event) => {
        try {
          const data: ServerMessage = JSON.parse(event.data);

          if (data.type === "partial") {
            setStatus("result_partial");
            const entry: SocketTranscriptEntry = {
              id: data.id ?? `ws-${++idCounterRef.current}`,
              text: data.text ?? "",
              timestamp: Date.now(),
              isFinal: false,
              language,
            };
            setTranscripts((prev) => {
              if (prev.length > 0 && !prev[prev.length - 1].isFinal) {
                return [...prev.slice(0, -1), entry];
              }
              return [...prev, entry];
            });
          }

          if (data.type === "transcript") {
            setStatus("result_final");
            const entry: SocketTranscriptEntry = {
              id: data.id ?? `ws-${++idCounterRef.current}`,
              text: data.text ?? "",
              timestamp: Date.now(),
              isFinal: true,
              language,
            };
            setTranscripts((prev) => {
              if (prev.length > 0 && !prev[prev.length - 1].isFinal) {
                return [...prev.slice(0, -1), entry];
              }
              return [...prev, entry];
            });
            // Go back to streaming status after a final result
            setTimeout(() => {
              if (isStreamingRef.current) setStatus("streaming");
            }, 100);
          }

          if (data.type === "error") {
            setError(data.message ?? "Server transcription error");
          }

          if (data.type === "summary_update" && data.summary) {
            setSummaries((prev) => [
              ...prev,
              {
                id: data.id ?? `sum-${Date.now()}`,
                text: data.summary!,
                timestamp: Date.now(),
                intervalLabel: data.intervalLabel ?? "3-minute",
              },
            ]);
          }

          if (data.type === "ai_response" && data.answer) {
            setAiResponses((prev) => [
              ...prev,
              {
                id: data.id ?? `air-${Date.now()}`,
                query: data.query ?? "",
                answer: data.answer!,
                timestamp: Date.now(),
              },
            ]);
          }
        } catch {
          // Plain text fallback
          const text = typeof event.data === "string" ? event.data : "";
          if (text) {
            const entry: SocketTranscriptEntry = {
              id: `ws-${++idCounterRef.current}`,
              text,
              timestamp: Date.now(),
              isFinal: true,
              language,
            };
            setTranscripts((prev) => [...prev, entry]);
          }
        }
      };

      ws.onerror = () => {
        setError(`WebSocket error. Is the server running at ${wsUrl}?`);
        setStatus("error");
      };

      ws.onclose = (e) => {
        if (e.code !== 1000 && isStreamingRef.current) {
          const reason = CLOSE_REASONS[e.code] ?? `Unexpected disconnect (code ${e.code}).`;
          setError(reason);
          setStatus("error");
        } else if (!isStreamingRef.current) {
          setStatus("idle");
        }
        cleanup();
      };

      // 3. Create audio pipeline — PCM16 chunks go straight to the socket
      const pipeline = await createAudioPipeline(
        (pcm16: ArrayBuffer) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(pcm16);
          }
        },
        {
          sampleRate: 16000,
          chunkIntervalMs: 250,
          channels: 1,
          ...audioConfig,
        }
      );
      pipelineRef.current = pipeline;
      setAnalyserNode(pipeline.analyser);

      // 4. Start duration timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      isStreamingRef.current = true;
      setStatus("streaming");
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access denied. Please allow mic permissions."
          : err instanceof DOMException && err.name === "NotFoundError"
            ? "No microphone found. Please connect a microphone."
            : err instanceof Error
              ? err.message
              : "Failed to start streaming";
      setError(msg);
      setStatus("error");
      cleanup();
    }
  }, [wsUrl, language, audioConfig, cleanup]);

  /** Stop streaming */
  const stop = useCallback(() => {
    isStreamingRef.current = false;
    setStatus("idle");
    cleanup();
  }, [cleanup]);

  /** Toggle start/stop */
  const toggle = useCallback(() => {
    if (status === "idle" || status === "error") {
      start();
    } else {
      stop();
    }
  }, [status, start, stop]);

  /** Clear transcript log */
  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
    idCounterRef.current = 0;
  }, []);

  /** Dismiss error */
  const dismissError = useCallback(() => {
    setError(null);
    if (status === "error") setStatus("idle");
  }, [status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const clearSummaries = useCallback(() => setSummaries([]), []);
  const clearAiResponses = useCallback(() => setAiResponses([]), []);

  return {
    status,
    transcripts,
    error,
    analyserNode,
    duration,
    summaries,
    aiResponses,
    isStreaming: status === "streaming" || status === "result_partial" || status === "result_final",
    start,
    stop,
    toggle,
    clearTranscripts,
    clearSummaries,
    clearAiResponses,
    dismissError,
  };
}
