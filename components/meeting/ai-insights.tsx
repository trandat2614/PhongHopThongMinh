"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  BookOpen,
  Lightbulb,
  Target,
  Clock,
  X,
  RefreshCw,
  ListTodo,
  FileSearch2,
  AlarmClock,
  Zap,
} from "lucide-react";
import type { TranscriptEntry } from "@/lib/stt-types";
import type { MeetingSummary } from "@/hooks/use-socket-stt";

export interface ContextualHint {
  id: string;
  text: string;
  reference?: string;
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
  summaries?: MeetingSummary[];
  onClose?: () => void;
}

type Tab = "summary" | "context" | "actions";

// ── AI simulation helpers ────────────────────────────────────────────────────

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
  } else if (allText.length > 0) {
    // No doc — show general insight hints
    const generalHints: ContextualHint[] = [];
    if (allText.includes("ngân sách") || allText.includes("chi phí") || allText.includes("budget")) {
      generalHints.push({
        id: "hint-finance-general",
        text: "Chủ đề tài chính được đề cập trong cuộc họp",
        type: "insight",
        timestamp: Date.now(),
      });
    }
    if (allText.includes("deadline") || allText.includes("hạn") || allText.includes("ngày")) {
      generalHints.push({
        id: "hint-date-general",
        text: "Có nhắc đến thời hạn hoặc lịch trình",
        type: "insight",
        timestamp: Date.now(),
      });
    }
    return generalHints;
  }

  return hints;
}

function generateActionItems(transcripts: TranscriptEntry[]): LiveKeyPoint[] {
  const final = transcripts.filter((t) => t.isFinal);
  if (final.length === 0) return [];
  return final
    .filter((t) => t.text.length > 20)
    .slice(-5)
    .map((t) => ({
      id: `kp-${t.id}`,
      text: t.text.length > 90 ? t.text.substring(0, 90) + "…" : t.text,
      timestamp: t.timestamp,
      confidence: 0.7 + Math.random() * 0.28,
    }));
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

// ── Sub-panel components ─────────────────────────────────────────────────────

function SummaryTab({
  summaries,
  isRecording,
  glowing,
}: {
  summaries: MeetingSummary[];
  isRecording: boolean;
  glowing: boolean;
}) {
  if (summaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center px-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl border bg-emerald-500/10 border-emerald-500/20 transition-all ${
            glowing ? "shadow-lg shadow-emerald-500/30" : ""
          }`}
        >
          <AlarmClock className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <p className="text-xs font-medium text-foreground/70">
            {isRecording ? "Đang chờ tóm tắt tự động..." : "Chưa có tóm tắt"}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Tóm tắt được tạo sau mỗi 3 phút ghi âm
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3">
      {summaries.map((s, i) => (
        <div
          key={i}
          className={`rounded-xl border p-3 transition-all ${
            i === summaries.length - 1 && glowing
              ? "border-emerald-500/50 bg-emerald-500/8 shadow-md shadow-emerald-500/20"
              : "border-border bg-secondary/30"
          }`}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlarmClock className="h-3 w-3 text-emerald-400 shrink-0" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">
              Tóm tắt #{i + 1}
            </span>
            <span className="ml-auto font-mono text-[9px] text-muted-foreground">
              {new Date(s.timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <p className="text-[11px] text-foreground/85 leading-relaxed">{s.text}</p>
        </div>
      ))}
    </div>
  );
}

function ContextTab({
  hints,
  isThinking,
  isRecording,
}: {
  hints: ContextualHint[];
  isThinking: boolean;
  isRecording: boolean;
}) {
  if (isThinking) {
    return (
      <div className="space-y-2 p-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-lg bg-secondary/50 h-12" />
        ))}
      </div>
    );
  }

  if (hints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center px-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10">
          <FileSearch2 className="h-5 w-5 text-violet-400" />
        </div>
        <div>
          <p className="text-xs font-medium text-foreground/70">
            {isRecording ? "Đang phân tích nội dung..." : "Chưa có gợi ý"}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Tải tài liệu lên để nhận gợi ý ngữ cảnh
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3">
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
    </div>
  );
}

function ActionsTab({
  items,
  isThinking,
  isRecording,
}: {
  items: LiveKeyPoint[];
  isThinking: boolean;
  isRecording: boolean;
}) {
  if (isThinking) {
    return (
      <div className="space-y-2 p-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-lg bg-secondary/50 h-14" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center px-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
          <ListTodo className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs font-medium text-foreground/70">
            {isRecording ? "Đang theo dõi hành động..." : "Chưa có action items"}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Bắt đầu ghi âm để trích xuất hành động
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3">
      {items.map((item, idx) => (
        <div
          key={item.id}
          className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/20 p-2.5 hover:bg-secondary/40 transition-colors"
        >
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 mt-0.5">
            <span className="text-[9px] font-bold text-primary">{idx + 1}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-foreground/90 leading-snug">{item.text}</p>
            <div className="mt-1 flex items-center gap-2">
              <Clock className="h-2.5 w-2.5 text-muted-foreground" />
              <span className="text-[9px] font-mono text-muted-foreground">
                {formatTime(item.timestamp)}
              </span>
              {item.confidence !== undefined && (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <div className="flex items-center gap-1">
                    <div className="h-1 w-10 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.round(item.confidence * 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground">
                      {Math.round(item.confidence * 100)}%
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function AIInsights({
  transcripts,
  isRecording,
  documentName,
  documentNumPages,
  summaries = [],
  onClose,
}: AIInsightsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [hints, setHints] = useState<ContextualHint[]>([]);
  const [actionItems, setActionItems] = useState<LiveKeyPoint[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [glowing, setGlowing] = useState(false);

  const lastProcessedCount = useRef(0);
  const lastSummaryCount = useRef(summaries.length);
  const thinkingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const glowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Glow when a new summary arrives
  useEffect(() => {
    if (summaries.length > lastSummaryCount.current) {
      lastSummaryCount.current = summaries.length;
      setGlowing(true);
      setActiveTab("summary"); // auto-switch to summary tab
      if (glowTimer.current) clearTimeout(glowTimer.current);
      glowTimer.current = setTimeout(() => setGlowing(false), 4000);
    }
    return () => {
      if (glowTimer.current) clearTimeout(glowTimer.current);
    };
  }, [summaries]);

  // Re-derive context hints & action items when transcripts change
  useEffect(() => {
    const finalCount = transcripts.filter((t) => t.isFinal).length;
    if (finalCount === lastProcessedCount.current) return;
    lastProcessedCount.current = finalCount;

    if (finalCount === 0) {
      setHints([]);
      setActionItems([]);
      return;
    }

    setIsThinking(true);
    if (thinkingTimer.current) clearTimeout(thinkingTimer.current);
    thinkingTimer.current = setTimeout(() => {
      setHints(generateContextualHints(transcripts, documentName, documentNumPages));
      setActionItems(generateActionItems(transcripts));
      setIsThinking(false);
    }, 800);

    return () => {
      if (thinkingTimer.current) clearTimeout(thinkingTimer.current);
    };
  }, [transcripts, documentName, documentNumPages]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: "summary",
      label: "Tóm tắt 3p",
      icon: <AlarmClock className="h-3 w-3" />,
      badge: summaries.length,
    },
    {
      id: "context",
      label: "Gợi ý ngữ cảnh",
      icon: <FileSearch2 className="h-3 w-3" />,
      badge: hints.length,
    },
    {
      id: "actions",
      label: "Hành động",
      icon: <ListTodo className="h-3 w-3" />,
      badge: actionItems.length,
    },
  ];

  return (
    <div
      className={`flex flex-col h-full bg-card border-l border-border transition-all duration-500 ${
        glowing ? "ring-2 ring-inset ring-emerald-500/40 shadow-inner shadow-emerald-500/10" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 transition-all ${
                glowing ? "shadow-md shadow-emerald-500/40" : ""
              }`}
            >
              <Sparkles
                className={`h-4 w-4 ${glowing ? "text-emerald-400" : "text-emerald-400"}`}
              />
            </div>
            {isRecording && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground leading-tight">Trợ lý Than AI</h3>
            <p className="text-[9px] text-muted-foreground">
              {isThinking ? "Đang phân tích..." : isRecording ? "Đang theo dõi" : "Chờ ghi âm"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isThinking && <RefreshCw className="h-3.5 w-3.5 text-emerald-400 animate-spin" />}
          {glowing && <Zap className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />}
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              aria-label="Đóng Trợ lý Than AI"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0 bg-secondary/20">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 px-1 py-2 text-[9px] font-semibold transition-colors relative ${
              activeTab === tab.id
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            <span className="text-center leading-tight hidden sm:block">{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={`rounded-full px-1 py-0.5 text-[8px] font-bold ${
                  tab.id === "summary" && glowing
                    ? "bg-emerald-500/30 text-emerald-400"
                    : "bg-primary/20 text-primary"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "summary" && (
          <SummaryTab summaries={summaries} isRecording={isRecording} glowing={glowing} />
        )}
        {activeTab === "context" && (
          <ContextTab hints={hints} isThinking={isThinking} isRecording={isRecording} />
        )}
        {activeTab === "actions" && (
          <ActionsTab items={actionItems} isThinking={isThinking} isRecording={isRecording} />
        )}
      </div>

      {/* Live status tip */}
      {isRecording && (hints.length > 0 || actionItems.length > 0) && (
        <div className="flex items-center gap-2 rounded-none border-t border-primary/20 bg-primary/5 px-3 py-1.5 shrink-0">
          <Zap className="h-3 w-3 text-primary shrink-0" />
          <p className="text-[9px] text-muted-foreground">
            Cập nhật sau mỗi câu hoàn chỉnh
          </p>
        </div>
      )}
    </div>
  );
}
