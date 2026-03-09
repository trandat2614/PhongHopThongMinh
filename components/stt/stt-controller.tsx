"use client";

import { AudioWaveform, Trash2, Keyboard, Monitor, Server } from "lucide-react";
import { useSTTRecorder } from "@/hooks/use-stt-recorder";
import { SUPPORTED_LANGUAGES } from "@/lib/stt-types";
import { StatusIndicator } from "./status-indicator";
import { AudioVisualizer } from "./audio-visualizer";
import { RecordButton } from "./record-button";
import { TranscriptPanel } from "./transcript-panel";
import { ErrorBanner } from "./error-banner";
import { ConfigPanel } from "./config-panel";

export function STTController() {
  const {
    isRecording,
    status,
    transcripts,
    error,
    duration,
    analyserNode,
    config,
    toggleRecording,
    clearTranscripts,
    dismissError,
    updateConfig,
  } = useSTTRecorder();

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === config.language);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <AudioWaveform className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground tracking-tight">
                VoxStream
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Real-time Speech to Text
              </p>
            </div>
          </div>

          <StatusIndicator status={status} duration={duration} />
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-6 py-6">
        {/* Mode + language active badge */}
        {isRecording && (
          <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            {config.mode === "browser" ? (
              <Monitor className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <Server className="h-4 w-4 shrink-0 text-primary" />
            )}
            <p className="text-sm text-foreground/80">
              <span className="font-medium text-primary">
                {config.mode === "browser" ? "Browser Speech Recognition" : "Server Streaming"}
              </span>
              {" "}&mdash; Transcribing in{" "}
              <span className="font-medium">
                {currentLang?.label ?? config.language}
              </span>
              {config.mode === "server" && (
                <span className="text-muted-foreground">
                  {" "}| {config.chunkIntervalMs}ms chunks | {config.asrEngine}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Error banner */}
        {error && <ErrorBanner message={error} onDismiss={dismissError} />}

        {/* Configuration panel (collapsible) */}
        <ConfigPanel
          config={config}
          onUpdate={updateConfig}
          disabled={isRecording}
        />

        {/* Control panel */}
        <section className="rounded-xl border border-border bg-card p-6">
          {/* Visualizer */}
          <AudioVisualizer isActive={isRecording} analyserNode={analyserNode} />

          {/* Button + helpers */}
          <div className="mt-6 flex flex-col items-center gap-4">
            <RecordButton
              isRecording={isRecording}
              isConnecting={status === "connecting"}
              onToggle={toggleRecording}
            />

            <p className="text-xs text-muted-foreground">
              {isRecording
                ? "Recording in progress. Click to stop."
                : "Click to start recording"}
            </p>
          </div>
        </section>

        {/* Transcript area */}
        <section className="flex flex-1 flex-col rounded-xl border border-border bg-card">
          {/* Transcript header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Transcript
            </h2>
            <div className="flex items-center gap-2">
              {transcripts.length > 0 && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary tabular-nums">
                  {transcripts.filter((t) => t.isFinal).length} segments
                </span>
              )}
              <button
                onClick={clearTranscripts}
                disabled={transcripts.length === 0}
                aria-label="Clear transcript"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Transcript body */}
          <div className="flex flex-1 flex-col p-4" style={{ minHeight: 280 }}>
            <TranscriptPanel entries={transcripts} isRecording={isRecording} />
          </div>
        </section>

        {/* Keyboard shortcut hint */}
        <div className="flex items-center justify-center gap-2 pb-2 text-[11px] text-muted-foreground">
          <Keyboard className="h-3 w-3" />
          <span>
            Press{" "}
            <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
              Space
            </kbd>{" "}
            to toggle recording
          </span>
        </div>
      </main>
    </div>
  );
}
