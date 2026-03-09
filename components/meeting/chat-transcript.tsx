"use client";

import { useEffect, useRef } from "react";
import { User, Loader2 } from "lucide-react";
import type { TranscriptEntry } from "@/lib/stt-types";

interface ChatTranscriptProps {
  entries: TranscriptEntry[];
  isRecording: boolean;
  currentUserId?: string;
}

export function ChatTranscript({
  entries,
  isRecording,
  currentUserId = "Bạn",
}: ChatTranscriptProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary">
          <User className="h-5 w-5" />
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
    <div className="flex flex-1 flex-col overflow-y-auto scroll-smooth p-4">
      <div className="flex flex-col gap-3">
        {entries.map((entry, idx) => {
          const userId = entry.userId ?? currentUserId;
          const isCurrentUser = userId === currentUserId;
          const showHeader =
            idx === 0 || entries[idx - 1].userId !== entry.userId;

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
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-3 w-3" />
                  </div>
                  <span className="text-xs font-medium text-foreground/80">
                    {entry.userName ?? userId}
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
                className={`relative max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isCurrentUser
                    ? entry.isFinal
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-primary/20 text-foreground border border-primary/30 rounded-br-md"
                    : entry.isFinal
                      ? "bg-secondary text-foreground rounded-bl-md"
                      : "bg-secondary/50 text-foreground/80 border border-border rounded-bl-md"
                }`}
              >
                <p>{entry.text}</p>

                {/* Typing indicator */}
                {!entry.isFinal && (
                  <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-current/10">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <span className="text-[10px] uppercase tracking-wider text-primary font-medium">
                      Đang nhập...
                    </span>
                  </div>
                )}
              </div>

              {/* Timestamp */}
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
