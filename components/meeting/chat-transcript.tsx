"use client";

import { useEffect, useRef, useState } from "react";
import { User, Loader2, Mic } from "lucide-react";
import type { TranscriptEntry } from "@/lib/stt-types";

interface ChatTranscriptProps {
  entries: TranscriptEntry[];
  isRecording: boolean;
  currentUserId?: string;
  onFinalEntry?: (entry: TranscriptEntry) => void;
}

// A consistent palette of colors for up to 8 distinct speakers
const SPEAKER_COLORS = [
  { bg: "bg-primary/15 border-primary/30", bubble: "bg-primary/20 border border-primary/40", accent: "text-primary", avatar: "bg-primary/20 text-primary" },
  { bg: "bg-chart-2/15 border-chart-2/30", bubble: "bg-chart-2/20 border border-chart-2/40", accent: "text-chart-2", avatar: "bg-chart-2/20 text-chart-2" },
  { bg: "bg-chart-4/15 border-chart-4/30", bubble: "bg-chart-4/20 border border-chart-4/40", accent: "text-chart-4", avatar: "bg-chart-4/20 text-chart-4" },
  { bg: "bg-violet-500/15 border-violet-500/30", bubble: "bg-violet-500/20 border border-violet-500/40", accent: "text-violet-400", avatar: "bg-violet-500/20 text-violet-400" },
  { bg: "bg-chart-5/15 border-chart-5/30", bubble: "bg-chart-5/20 border border-chart-5/40", accent: "text-chart-5", avatar: "bg-chart-5/20 text-chart-5" },
  { bg: "bg-emerald-500/15 border-emerald-500/30", bubble: "bg-emerald-500/20 border border-emerald-500/40", accent: "text-emerald-400", avatar: "bg-emerald-500/20 text-emerald-400" },
  { bg: "bg-pink-500/15 border-pink-500/30", bubble: "bg-pink-500/20 border border-pink-500/40", accent: "text-pink-400", avatar: "bg-pink-500/20 text-pink-400" },
  { bg: "bg-amber-500/15 border-amber-500/30", bubble: "bg-amber-500/20 border border-amber-500/40", accent: "text-amber-400", avatar: "bg-amber-500/20 text-amber-400" },
];

export function ChatTranscript({
  entries,
  isRecording,
  currentUserId = "Bạn",
  onFinalEntry,
}: ChatTranscriptProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const processedIds = useRef<Set<string>>(new Set());

  // Build speaker → color index map
  const [speakerColorMap] = useState(() => new Map<string, number>());
  let speakerCounter = 0;

  function getSpeakerColor(speakerKey: string) {
    if (!speakerColorMap.has(speakerKey)) {
      speakerColorMap.set(speakerKey, speakerCounter % SPEAKER_COLORS.length);
      speakerCounter++;
    }
    return SPEAKER_COLORS[speakerColorMap.get(speakerKey)!];
  }

  // Auto-scroll on new entries
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  // Fire callback for each new final entry (retrieval simulation trigger)
  useEffect(() => {
    entries.forEach((entry) => {
      if (entry.isFinal && !processedIds.current.has(entry.id)) {
        processedIds.current.add(entry.id);
        onFinalEntry?.(entry);
      }
    });
  }, [entries, onFinalEntry]);

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 text-muted-foreground p-6">
        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-secondary">
            <User className="h-6 w-6" />
          </div>
          {isRecording && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
              <span className="absolute h-4 w-4 rounded-full bg-primary opacity-40 animate-ping" />
              <Mic className="relative h-2.5 w-2.5 text-primary" />
            </span>
          )}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground/70">
            {isRecording ? "Đang lắng nghe..." : "Chưa có tin nhắn"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isRecording
              ? "Hãy nói để xem bản ghi xuất hiện tại đây"
              : "Bắt đầu ghi âm để tạo bản ghi cuộc họp"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto scroll-smooth p-4">
      <div className="flex flex-col gap-2.5">
        {entries.map((entry, idx) => {
          const userId = entry.userId ?? currentUserId;
          const isCurrentUser = userId === currentUserId;
          const speakerKey = userId;
          const color = getSpeakerColor(speakerKey);
          const showHeader =
            idx === 0 || entries[idx - 1].userId !== entry.userId;
          const displayName = entry.userName ?? userId;

          return (
            <div
              key={entry.id}
              className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"}`}
            >
              {/* Speaker header */}
              {showHeader && (
                <div
                  className={`flex items-center gap-2 mb-1.5 ${
                    isCurrentUser ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Colored avatar */}
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${color.avatar}`}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className={`text-xs font-semibold ${color.accent}`}>
                    {displayName}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                    {new Date(entry.timestamp).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}

              {/* Chat bubble */}
              <div
                className={`relative max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed transition-all ${
                  isCurrentUser
                    ? entry.isFinal
                      ? "bg-primary text-primary-foreground rounded-br-md shadow-sm shadow-primary/20"
                      : "bg-primary/20 text-foreground border border-primary/30 rounded-br-md"
                    : entry.isFinal
                    ? `${color.bubble} text-foreground rounded-bl-md`
                    : "bg-secondary/50 text-foreground/80 border border-border rounded-bl-md"
                }`}
              >
                <p>{entry.text}</p>

                {/* Typing indicator for interim results */}
                {!entry.isFinal && (
                  <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-current/10">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <span className="text-[10px] uppercase tracking-wider text-primary font-medium">
                      Đang nhập...
                    </span>
                  </div>
                )}
              </div>

              {/* Timestamp for consecutive messages */}
              {!showHeader && (
                <span
                  className={`text-[9px] font-mono text-muted-foreground/60 mt-0.5 ${
                    isCurrentUser ? "mr-2" : "ml-2"
                  }`}
                >
                  {new Date(entry.timestamp).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
