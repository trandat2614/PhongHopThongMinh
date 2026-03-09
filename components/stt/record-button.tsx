"use client";

import { Mic, Square } from "lucide-react";
import type { RecordButtonProps } from "@/lib/stt-types";

export function RecordButton({
  isRecording,
  isConnecting,
  onToggle,
}: RecordButtonProps) {
  return (
    <button
      onClick={onToggle}
      disabled={isConnecting}
      aria-label={isRecording ? "Dừng ghi âm" : "Bắt đầu ghi âm"}
      className="group relative flex h-20 w-20 items-center justify-center rounded-full outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
    >
      {/* Outer pulse rings when recording */}
      {isRecording && (
        <>
          <span
            className="absolute inset-0 rounded-full bg-primary/20"
            style={{
              animation: "pulse-ring 2s cubic-bezier(0,0,0.2,1) infinite",
            }}
          />
          <span
            className="absolute inset-0 rounded-full bg-primary/10"
            style={{
              animation:
                "pulse-ring 2s cubic-bezier(0,0,0.2,1) infinite 0.5s",
            }}
          />
        </>
      )}

      {/* Button body */}
      <span
        className={`relative z-10 flex h-full w-full items-center justify-center rounded-full border-2 transition-all duration-300 ${
          isRecording
            ? "border-primary bg-primary/15 text-primary shadow-[0_0_30px_var(--live-glow)]"
            : "border-border bg-secondary text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
        }`}
      >
        {isConnecting ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : isRecording ? (
          <Square className="h-5 w-5 fill-current" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </span>
    </button>
  );
}
