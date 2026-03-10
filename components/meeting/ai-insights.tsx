"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  BookOpen,
  Lightbulb,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  Target,
  X,
  RefreshCw,
} from "lucide-react";
import type { TranscriptEntry } from "@/lib/stt-types";

export interface ContextualHint {
  id: string;
  text: string;
  reference?: string; // e.g., "Page 5 of the contract"
  type: "document" | "insight" | "action";
  timestamp: number;
}

export interface LiveKeyPoint {
  id: string;
  text: string;
  timestamp: number;
  confidence?: number;
}

interface AIInsightsProps {
  transcripts: TranscriptEntry[];
  isRecording: boolean;
  documentName?: string;
  documentNumPages?: number;
  onClose?: () => void;
}

// Simulated AI insight generation based on transcript keywords
function generateContextualHints(
  transcripts: TranscriptEntry[],
  docName?: string,
  numPages?: number
): ContextualHint[] {
  const finalTexts = transcripts.filter((t) => t.isFinal).map((t) => t.text.toLowerCase());
  const hints: ContextualHint[] = [];

  const keywords = {
    contract: ["hợp đồng", "contract", "điều khoản", "clause", "khoản", "term"],
    finance: ["ngân sách", "budget", "chi phí", "cost", "tiền", "money", "tài chính", "finance"],
    deadline: ["hạn chót", "deadline", "ngày", "date", "thời hạn", "timeline"],
    decision: ["quyết định", "decide", "decision", "phê duyệt", "approve", "đồng ý", "agree"],
    risk: ["rủi ro", "risk", "vấn đề", "problem", "lo ngại", "concern"],
  };

  const allText = finalTexts.join(" ");

  if (numPages && docName) {
    for (const [category, words] of Object.entries(keywords)) {
      const found = words.some((w) => allText.includes(w));
      if (found) {
        const page = Math.floor(Math.random() * numPages) + 1;
        const label =
          category === "contract"
            ? "Liên quan đến điều khoản"
            : category === "finance"
            ? "Liên quan đến ngân sách"
            : category === "deadline"
            ? "Liên quan đến tiến độ"
            : category === "decision"
            ? "Điểm cần ra quyết định"
            : "Rủi ro tiềm ẩn";

        hints.push({
          id: `hint-${category}`,
          text: label,
          reference: `Trang ${page} của ${docName}`,
          type: category === "decision" || category === "risk" ? "action" : "document",
          timestamp: Date.now(),
        });
      }
    }
  }

  return hints;
}

function generateKeyPoints(transcripts: TranscriptEntry[]): LiveKeyPoint[] {
  const final = transcripts.filter((t) => t.isFinal);
  if (final.length === 0) return [];

  // Extract last few substantial transcript entries as "key points"
  return final
    .filter((t) => t.text.length > 20)
    .slice(-5)
    .map((t, i) => ({
      id: `kp-${t.id}`,
      text: t.text.length > 80 ? t.text.substring(0, 80) + "..." : t.text,
      timestamp: t.timestamp,
      confidence: 0.7 + Math.random() * 0.28,
    }));
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  badgeCount?: number;
  defaultOpen?: boolean;
  accentColor?: string;
}

function CollapsibleSection({
  title,
  icon,
  children,
  badgeCount,
  defaultOpen = true,
  accentColor = "text-primary",
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-secondary/40 hover:bg-secondary/70 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span className={accentColor}>{icon}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          {badgeCount !== undefined && badgeCount > 0 && (
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold bg-primary/20 text-primary`}>
              {badgeCount}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      {open && <div className="p-3 space-y-2">{children}</div>}
    </div>
  );
}

export function AIInsights({
  transcripts,
  isRecording,
  documentName,
  documentNumPages,
  onClose,
}: AIInsightsProps) {
  const [hints, setHints] = useState<ContextualHint[]>([]);
  const [keyPoints, setKeyPoints] = useState<LiveKeyPoint[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const lastProcessedCount = useRef(0);
  const thinkingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-derive insights when transcripts change
  useEffect(() => {
    const finalCount = transcripts.filter((t) => t.isFinal).length;
    if (finalCount === lastProcessedCount.current) return;
    lastProcessedCount.current = finalCount;

    if (finalCount === 0) {
      setHints([]);
      setKeyPoints([]);
      return;
    }

    // Show "thinking" animation briefly
    setIsThinking(true);
    if (thinkingTimer.current) clearTimeout(thinkingTimer.current);
    thinkingTimer.current = setTimeout(() => {
      setHints(generateContextualHints(transcripts, documentName, documentNumPages));
      setKeyPoints(generateKeyPoints(transcripts));
      setIsThinking(false);
    }, 800);

    return () => {
      if (thinkingTimer.current) clearTimeout(thinkingTimer.current);
    };
  }, [transcripts, documentName, documentNumPages]);

  const hasContent = hints.length > 0 || keyPoints.length > 0;

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20">
              <Sparkles className="h-4 w-4 text-violet-400" />
            </div>
            {isRecording && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground">AI Insights</h3>
            <p className="text-[10px] text-muted-foreground">
              {isThinking ? "Đang phân tích..." : isRecording ? "Đang theo dõi" : "Chờ ghi âm"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isThinking && (
            <RefreshCw className="h-3.5 w-3.5 text-violet-400 animate-spin" />
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              aria-label="Đóng AI Insights"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Empty / Idle state */}
        {!hasContent && !isThinking && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 border border-violet-500/20">
              <Sparkles className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground/70">
                {isRecording
                  ? "Đang chờ nội dung hội thoại..."
                  : "Bắt đầu ghi âm để nhận insights"}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                AI sẽ phân tích nội dung và tài liệu theo thời gian thực
              </p>
            </div>
          </div>
        )}

        {/* Thinking placeholder */}
        {isThinking && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-lg bg-secondary/50 h-12" />
            ))}
          </div>
        )}

        {/* Contextual Hints */}
        {!isThinking && hints.length > 0 && (
          <CollapsibleSection
            title="Gợi ý nội dung"
            icon={<BookOpen className="h-3.5 w-3.5" />}
            badgeCount={hints.length}
            accentColor="text-chart-2"
          >
            {hints.map((hint) => (
              <div
                key={hint.id}
                className={`rounded-lg border p-2.5 transition-colors ${
                  hint.type === "action"
                    ? "border-chart-4/30 bg-chart-4/5"
                    : hint.type === "document"
                    ? "border-chart-2/30 bg-chart-2/5"
                    : "border-violet-500/30 bg-violet-500/5"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">
                    {hint.type === "action" ? (
                      <Target className="h-3.5 w-3.5 text-chart-4" />
                    ) : hint.type === "document" ? (
                      <BookOpen className="h-3.5 w-3.5 text-chart-2" />
                    ) : (
                      <Lightbulb className="h-3.5 w-3.5 text-violet-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-foreground leading-snug">{hint.text}</p>
                    {hint.reference && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground font-mono">
                        📄 {hint.reference}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CollapsibleSection>
        )}

        {/* Live Key Points */}
        {!isThinking && keyPoints.length > 0 && (
          <CollapsibleSection
            title="Điểm chính trực tiếp"
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            badgeCount={keyPoints.length}
            accentColor="text-primary"
          >
            {keyPoints.map((kp, idx) => (
              <div
                key={kp.id}
                className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/20 p-2.5 hover:bg-secondary/40 transition-colors"
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 mt-0.5">
                  <span className="text-[9px] font-bold text-primary">{idx + 1}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-foreground/90 leading-snug">{kp.text}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="text-[9px] font-mono text-muted-foreground">
                      {formatTime(kp.timestamp)}
                    </span>
                    {kp.confidence !== undefined && (
                      <>
                        <span className="text-muted-foreground/40">•</span>
                        <div className="flex items-center gap-1">
                          <div className="h-1 w-12 rounded-full bg-border overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${Math.round(kp.confidence * 100)}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-muted-foreground">
                            {Math.round(kp.confidence * 100)}%
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CollapsibleSection>
        )}

        {/* Real-time status tip */}
        {isRecording && hasContent && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
            <p className="text-[10px] text-muted-foreground">
              Insights được cập nhật sau mỗi lần nhận văn bản hoàn chỉnh
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
