"use client";

import { useEffect, useRef } from "react";
import { MessageSquareText } from "lucide-react";
import type { TranscriptPanelProps } from "@/lib/stt-types";

export function TranscriptPanel({ entries, isRecording }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-secondary">
          <MessageSquareText className="h-6 w-6" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground/70">
            {isRecording ? "Đang lắng nghe..." : "Chưa có bản ghi"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isRecording
              ? "Hãy nói rõ vào micro của bạn"
              : "Nhấn nút ghi âm hoặc phím Space để bắt đầu"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scroll-smooth px-1">
      <div className="flex flex-col gap-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`rounded-lg px-4 py-3 text-sm leading-relaxed transition-colors ${
              entry.isFinal
                ? "bg-secondary text-foreground"
                : "bg-primary/5 text-foreground/80 border border-primary/20"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="flex-1">{entry.text}</p>
              <span className="mt-0.5 shrink-0 text-[10px] font-mono text-muted-foreground tabular-nums">
                {new Date(entry.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
            {!entry.isFinal && (
              <span className="mt-1 inline-block text-[10px] uppercase tracking-wider text-primary">
                đang nhập
              </span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
