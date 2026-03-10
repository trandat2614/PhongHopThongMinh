"use client";

import { useState, useCallback, useRef } from "react";
import {
  Bot,
  Trash2,
  Download,
  FileText,
  MessageSquare,
  Wifi,
  WifiOff,
  Loader2,
  Radio,
  Users,
  Lock,
  LogOut,
  Copy,
  Check,
  Sparkles,
  ClipboardList,
  ChevronLeft,
  Eye,
  EyeOff,
  MessageCircle,
  AlarmClock,
  Zap,
} from "lucide-react";
import { useSTTRecorder } from "@/hooks/use-stt-recorder";
import {
  SUPPORTED_LANGUAGES,
  type ConnectionStatus,
  type RoomInfo,
  type TranscriptEntry,
} from "@/lib/stt-types";
import { AudioVisualizer } from "@/components/stt/audio-visualizer";
import { RecordButton } from "@/components/stt/record-button";
import { ErrorBanner } from "@/components/stt/error-banner";
import { ConfigPanel } from "@/components/stt/config-panel";
import { ChatTranscript } from "./chat-transcript";
import { DocumentViewer } from "./document-viewer";
import { RoomLobby } from "./room-lobby";
import { AIInsights } from "./ai-insights";
import { PostMeetingSummary } from "./post-meeting-summary";
import { AIChatbox } from "./ai-chatbox";
import { ThemeToggle } from "@/components/theme-toggle";
import type { MeetingSummary } from "@/hooks/use-socket-stt";

// ── Connection badge ─────────────────────────────────────────────────────────

function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const cfg: Record<ConnectionStatus, { icon: typeof Wifi; label: string; className: string }> = {
    idle: { icon: WifiOff, label: "Chưa kết nối", className: "bg-muted text-muted-foreground" },
    connecting: { icon: Loader2, label: "Đang kết nối", className: "bg-chart-4/20 text-chart-4" },
    live: { icon: Radio, label: "Đang ghi âm", className: "bg-primary/20 text-primary" },
    error: { icon: WifiOff, label: "Lỗi", className: "bg-destructive/20 text-destructive" },
  };
  const { icon: Icon, label, className } = cfg[status];
  return (
    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      <Icon className={`h-3 w-3 ${status === "connecting" ? "animate-spin" : status === "live" ? "animate-pulse" : ""}`} />
      <span>{label}</span>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function safeWriteClipboard(text: string): Promise<void> {
  if (typeof window !== "undefined" && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  }
  fallbackCopy(text);
  return Promise.resolve();
}

function fallbackCopy(text: string) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  } catch { /* ignore */ }
}

// ── Auto-summary banner (3-min summaries) ────────────────────────────────────

function SummaryBanner({ summaries }: { summaries: MeetingSummary[] }) {
  const [expanded, setExpanded] = useState(true);
  if (summaries.length === 0) return null;

  const latest = summaries[summaries.length - 1];

  return (
    <div className="mx-3 mb-2 rounded-xl border border-primary/25 bg-primary/5 overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-primary/10 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <AlarmClock className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            Tóm tắt tự động • {summaries.length} lần
          </span>
        </div>
        <span className="text-[9px] text-muted-foreground font-mono">
          {new Date(latest.timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </button>
      {expanded && (
        <div className="px-3 pb-2.5 pt-0.5 border-t border-primary/10">
          <p className="text-[11px] text-foreground/80 leading-relaxed">{latest.text}</p>
          {summaries.length > 1 && (
            <p className="mt-1 text-[9px] text-muted-foreground">
              +{summaries.length - 1} tóm tắt trước
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type MobileTab = "transcript" | "document" | "ai";

// ── MeetingController ─────────────────────────────────────────────────────────

export function MeetingController() {
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [copied, setCopied] = useState(false);

  // Panel visibility
  const [showInsights, setShowInsights] = useState(true);
  const [showChatbox, setShowChatbox] = useState(false);

  // Document state passed to AI
  const [documentName, setDocumentName] = useState<string | undefined>();
  const [documentNumPages, setDocumentNumPages] = useState<number | undefined>();

  // Post-meeting modal
  const [showPostMeeting, setShowPostMeeting] = useState(false);

  // Final transcript callback ref
  const handleFinalTranscript = useCallback((_entry: TranscriptEntry) => {
    // Could forward to backend RAG here
  }, []);

  const {
    isRecording,
    status,
    transcripts,
    error,
    duration,
    analyserNode,
    config,
    summaries,
    toggleRecording,
    clearTranscripts,
    dismissError,
    updateConfig,
    triggerRetrievalQuery,
    sendAIQuery,
  } = useSTTRecorder(
    roomInfo
      ? { roomId: roomInfo.roomId, roomPassword: roomInfo.password }
      : undefined,
    { onFinalTranscript: handleFinalTranscript }
  );

  const [documentCleared, setDocumentCleared] = useState(0);
  const [mobileTab, setMobileTab] = useState<MobileTab>("transcript");
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === config.language);

  // ── Room handlers ──

  const handleJoinRoom = useCallback((room: RoomInfo) => setRoomInfo(room), []);

  const handleLeaveRoom = useCallback(() => {
    if (isRecording) toggleRecording();
    clearTranscripts();
    setRoomInfo(null);
    setDocumentName(undefined);
    setDocumentNumPages(undefined);
    setShowChatbox(false);
  }, [isRecording, toggleRecording, clearTranscripts]);

  // ── Copy room info ──

  const copyRoomInfo = useCallback(() => {
    if (!roomInfo) return;
    const text = `Phòng họp Than AI\nMã phòng: ${roomInfo.roomId}\nMật khẩu: ${roomInfo.password}`;
    safeWriteClipboard(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [roomInfo]);

  // ── Export ──

  const exportTranscript = useCallback(() => {
    if (transcripts.length === 0) return;
    const lines = transcripts
      .filter((t) => t.isFinal)
      .map((t) => {
        const time = new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const speaker = t.userName ?? t.userId ?? "Người nói";
        return `[${time}] ${speaker}: ${t.text}`;
      })
      .join("\n");

    const summaryBlock = summaries.length > 0
      ? `\n\n${"─".repeat(50)}\nTÓM TẮT CUỘC HỌP (AI)\n${"─".repeat(50)}\n${summaries.map((s, i) => `[Tóm tắt #${i + 1} – ${new Date(s.timestamp).toLocaleTimeString("vi-VN")}]\n${s.text}`).join("\n\n")}`
      : "";

    const header = `Than AI - Bản Ghi Cuộc Họp\nPhòng: ${roomInfo?.roomId ?? "N/A"}\nNgày: ${new Date().toLocaleDateString("vi-VN")}\nNgôn ngữ: ${currentLang?.label ?? config.language}\nThời lượng: ${formatDuration(duration)}\n${"─".repeat(50)}\n\n`;
    const content = header + lines + summaryBlock;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `than-ai-banghi-${roomInfo?.roomId ?? "local"}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [transcripts, summaries, currentLang, config.language, duration, roomInfo]);

  // ── Clear ──

  const clearAll = useCallback(() => {
    clearTranscripts();
    setDocumentCleared((k) => k + 1);
    setDocumentName(undefined);
    setDocumentNumPages(undefined);
  }, [clearTranscripts]);

  // ── Document callbacks ──

  const handleDocumentLoaded = useCallback((name: string, numPages: number) => {
    setDocumentName(name);
    setDocumentNumPages(numPages);
  }, []);

  const handleDocumentCleared = useCallback(() => {
    setDocumentName(undefined);
    setDocumentNumPages(undefined);
  }, []);

  // ── Show lobby ──

  if (!roomInfo) return <RoomLobby onJoinRoom={handleJoinRoom} />;

  // ── Layout width calculation ──
  // If insights visible: 30/40/30. If chatbox replaces insights: split 30/40/30
  // Combined chatbox+insights when both on is not supported — chatbox takes priority over insights
  const rightPanelOpen = showInsights || showChatbox;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Header ── */}
      <header className="border-b border-border bg-card shrink-0">
        <div className="flex items-center justify-between px-4 py-3 lg:px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-chart-4/10 border border-primary/20">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <h1 className="than-ai-gradient text-sm font-bold tracking-tight">Than AI</h1>
                <span className="text-xs font-medium text-muted-foreground hidden md:inline">
                  Phòng Họp Thông Minh
                </span>
                <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-medium text-muted-foreground">
                  {roomInfo.roomId}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">Xin chào, {roomInfo.userName}</p>
            </div>
          </div>

          {/* Center: Status */}
          <div className="flex items-center gap-3">
            <ConnectionBadge status={status} />
            {isRecording && (
              <span className="font-mono text-sm text-foreground tabular-nums">
                {formatDuration(duration)}
              </span>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Copy */}
            <button
              onClick={copyRoomInfo}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80"
              title="Sao chép thông tin phòng"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copied ? "Đã chép" : "Chia sẻ"}</span>
            </button>

            {/* Post-meeting */}
            {transcripts.filter((t) => t.isFinal).length > 0 && (
              <button
                onClick={() => setShowPostMeeting(true)}
                className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                title="Tổng kết cuộc họp"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tổng kết</span>
              </button>
            )}

            {/* Export */}
            <button
              onClick={exportTranscript}
              disabled={transcripts.filter((t) => t.isFinal).length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Xuất</span>
            </button>

            {/* Clear */}
            <button
              onClick={clearAll}
              disabled={transcripts.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Xóa</span>
            </button>

            {/* AI Insights toggle (desktop) */}
            <button
              onClick={() => { setShowInsights((v) => !v); setShowChatbox(false); }}
              className={`hidden lg:flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                showInsights && !showChatbox
                  ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                  : "border-border bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
              title="Bật/tắt AI Insights"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Insights</span>
              {showInsights && !showChatbox ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>

            {/* AI Chat toggle (desktop) */}
            <button
              onClick={() => { setShowChatbox((v) => !v); setShowInsights(false); }}
              className={`hidden lg:flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                showChatbox
                  ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                  : "border-border bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
              title="Mở AI Chat"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>AI Chat</span>
            </button>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Leave */}
            <button
              onClick={handleLeaveRoom}
              className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Rời</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Error banner ── */}
      {error && (
        <div className="px-4 pt-4 lg:px-6">
          <ErrorBanner message={error} onDismiss={dismissError} />
        </div>
      )}

      {/* ── Control bar ── */}
      <div className="border-b border-border bg-card/50 px-4 py-3 lg:px-6 shrink-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <RecordButton isRecording={isRecording} isConnecting={status === "connecting"} onToggle={toggleRecording} />
            <div className="flex-1 min-w-[120px] max-w-[200px]">
              <AudioVisualizer isActive={isRecording} analyserNode={analyserNode} />
            </div>
            {isRecording && <span className="text-xs text-muted-foreground">{currentLang?.label ?? config.language}</span>}
            {summaries.length > 0 && (
              <div className="hidden sm:flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1">
                <Zap className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-primary font-medium">{summaries.length} tóm tắt AI</span>
              </div>
            )}
          </div>
          <ConfigPanel config={config} onUpdate={updateConfig} disabled={isRecording} />
        </div>
      </div>

      {/* ── Mobile: room info ── */}
      <div className="flex lg:hidden items-center justify-between border-b border-border bg-secondary/30 px-4 py-2 shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>Phòng: <span className="font-mono font-medium text-foreground">{roomInfo.roomId}</span></span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          <span>MK: <span className="font-mono font-medium text-foreground">{roomInfo.password}</span></span>
        </div>
      </div>

      {/* ── Mobile Tab Switcher ── */}
      <div className="flex lg:hidden border-b border-border bg-card shrink-0">
        {(
          [
            { id: "transcript", icon: MessageSquare, label: "Bản ghi", badge: transcripts.filter((t) => t.isFinal).length },
            { id: "document", icon: FileText, label: "Tài liệu", badge: 0 },
            { id: "ai", icon: Bot, label: "AI Chat", badge: 0 },
          ] as const
        ).map(({ id, icon: Icon, label, badge }) => (
          <button
            key={id}
            onClick={() => setMobileTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium transition-colors ${
              mobileTab === id
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            {badge > 0 && (
              <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold tabular-nums">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Main 3-panel layout ── */}
      <main className="flex flex-1 overflow-hidden">
        {/* ── LEFT: Transcript ── */}
        <section
          className={`flex flex-col border-border min-h-0 border-r transition-all duration-300 ${
            rightPanelOpen ? "lg:w-[30%]" : "lg:w-[55%]"
          } ${mobileTab === "transcript" ? "flex w-full" : "hidden lg:flex"}`}
        >
          {/* Panel header */}
          <div className="hidden lg:flex items-center justify-between border-b border-border px-4 py-2.5 bg-card/30 shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bản Ghi Trực Tiếp</h2>
            </div>
            <div className="flex items-center gap-2">
              {summaries.length > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary">
                  <Zap className="h-2.5 w-2.5" />{summaries.length} tóm tắt
                </span>
              )}
              {transcripts.length > 0 && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary tabular-nums">
                  {transcripts.filter((t) => t.isFinal).length} câu
                </span>
              )}
            </div>
          </div>

          {/* 3-min auto summaries banner */}
          <SummaryBanner summaries={summaries} />

          <ChatTranscript
            entries={transcripts}
            isRecording={isRecording}
            currentUserId={roomInfo.userName}
            onFinalEntry={(entry) => { triggerRetrievalQuery(entry.text); }}
          />
        </section>

        {/* ── CENTER: Document ── */}
        <section
          className={`flex flex-col min-h-0 border-border transition-all duration-300 ${
            rightPanelOpen ? "lg:w-[40%]" : "lg:w-[45%]"
          } ${mobileTab === "document" ? "flex w-full" : "hidden lg:flex"} ${rightPanelOpen ? "border-r" : ""}`}
        >
          <div className="hidden lg:flex items-center justify-between gap-2 border-b border-border px-4 py-2.5 bg-card/30 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-chart-2" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tài Liệu Tham Khảo</h2>
            </div>
            {documentName && (
              <span className="rounded-full bg-chart-2/10 px-2.5 py-0.5 text-[10px] font-medium text-chart-2 truncate max-w-[120px]">
                {documentName}
              </span>
            )}
          </div>

          <DocumentViewer
            key={documentCleared}
            onDocumentLoaded={handleDocumentLoaded}
            onDocumentCleared={handleDocumentCleared}
          />
        </section>

        {/* ── RIGHT: AI Insights or AI Chatbox ── */}
        {rightPanelOpen && (
          <section
            className={`flex flex-col min-h-0 lg:w-[30%] transition-all duration-300 ${
              mobileTab === "ai" ? "flex w-full" : "hidden lg:flex"
            }`}
          >
            {showChatbox ? (
              <AIChatbox
                transcripts={transcripts}
                documentName={documentName}
                onClose={() => setShowChatbox(false)}
              />
            ) : (
              <AIInsights
                transcripts={transcripts}
                isRecording={isRecording}
                documentName={documentName}
                documentNumPages={documentNumPages}
                onClose={() => setShowInsights(false)}
              />
            )}
          </section>
        )}

        {/* ── Collapsed right panel tab ── */}
        {!rightPanelOpen && (
          <div className="hidden lg:flex flex-col w-10 border-l border-border bg-card/20 shrink-0">
            <button
              onClick={() => setShowInsights(true)}
              className="flex flex-col items-center gap-2 py-5 hover:bg-primary/5 transition-colors group"
              title="Mở AI Insights"
            >
              <Sparkles className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              <span
                className="text-[9px] font-medium text-muted-foreground group-hover:text-primary uppercase tracking-wider"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              >
                Insights
              </span>
              <ChevronLeft className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
            </button>
            <div className="border-t border-border" />
            <button
              onClick={() => setShowChatbox(true)}
              className="flex flex-col items-center gap-2 py-5 hover:bg-primary/5 transition-colors group"
              title="Mở AI Chat"
            >
              <MessageCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              <span
                className="text-[9px] font-medium text-muted-foreground group-hover:text-primary uppercase tracking-wider"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              >
                AI Chat
              </span>
              <ChevronLeft className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
            </button>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card/30 px-4 py-2 text-center shrink-0">
        <p className="text-[10px] text-muted-foreground">
          Nhấn{" "}
          <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[9px]">Space</kbd>{" "}
          để bật/tắt ghi âm •{" "}
          <span className="than-ai-gradient font-semibold">Than AI</span>{" "}
          • Tài liệu xử lý cục bộ
        </p>
      </footer>

      {/* ── Post-meeting modal ── */}
      {showPostMeeting && roomInfo && (
        <PostMeetingSummary
          transcripts={transcripts}
          roomInfo={roomInfo}
          duration={duration}
          onClose={() => setShowPostMeeting(false)}
        />
      )}
    </div>
  );
}
