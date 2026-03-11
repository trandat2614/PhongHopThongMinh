"use client";

import { useState, useCallback } from "react";
import {
  Bot,
  Trash2,
  Download,
  MessageSquare,
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
  MessageCircle,
  AlarmClock,
  FileText,
  ChevronLeft,
  ChevronRight,
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
import { DocumentSidebar, type StoredFile } from "./document-sidebar";

// ── Connection badge ─────────────────────────────────────────────────────────
function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const cfg: Record<ConnectionStatus, { icon: typeof WifiOff; label: string; cls: string }> = {
    idle:       { icon: WifiOff,  label: "Chưa kết nối", cls: "bg-muted text-muted-foreground" },
    connecting: { icon: Loader2,  label: "Đang kết nối", cls: "bg-chart-4/20 text-chart-4" },
    live:       { icon: Radio,    label: "Đang ghi âm",  cls: "bg-primary/20 text-primary" },
    error:      { icon: WifiOff,  label: "Lỗi kết nối",  cls: "bg-destructive/20 text-destructive" },
  };
  const { icon: Icon, label, cls } = cfg[status];
  return (
    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cls}`}>
      <Icon className={`h-3 w-3 ${status === "connecting" ? "animate-spin" : status === "live" ? "animate-pulse" : ""}`} />
      <span>{label}</span>
    </div>
  );
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

function safeClip(text: string) {
  if (typeof window !== "undefined" && navigator.clipboard?.writeText)
    return navigator.clipboard.writeText(text).catch(() => fallback(text));
  fallback(text); return Promise.resolve();
}
function fallback(text: string) {
  try {
    const ta = Object.assign(document.createElement("textarea"), {
      value: text, style: "position:fixed;left:-9999px",
    });
    document.body.appendChild(ta); ta.focus(); ta.select();
    document.execCommand("copy"); document.body.removeChild(ta);
  } catch { /* ignore */ }
}

type MobileTab = "transcript" | "document" | "ai";

// ── MeetingController ─────────────────────────────────────────────────────────
export function MeetingController() {
  const [roomInfo, setRoomInfo]           = useState<RoomInfo | null>(null);
  const [copied, setCopied]               = useState(false);
  const [showInsights, setShowInsights]   = useState(true);
  const [showChatbox, setShowChatbox]     = useState(false);
  const [showFilePanel, setShowFilePanel] = useState(true); // collapsible file list
  const [storedFiles, setStoredFiles]     = useState<StoredFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | undefined>();
  const [showPostMeeting, setShowPostMeeting] = useState(false);
  const [mobileTab, setMobileTab]         = useState<MobileTab>("transcript");

  const { isRecording, status, transcripts, error, duration,
    analyserNode, config, summaries,
    toggleRecording, clearTranscripts, dismissError,
    updateConfig, triggerRetrievalQuery,
  } = useSTTRecorder(
    roomInfo ? { roomId: roomInfo.roomId, roomPassword: roomInfo.password } : undefined,
    { onFinalTranscript: useCallback((_e: TranscriptEntry) => {}, []) }
  );

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === config.language);
  const selectedFile = storedFiles.find((f) => f.id === selectedFileId) ?? null;
  const documentName = selectedFile?.name;
  const documentNumPages = selectedFile?.numPages;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleJoinRoom   = useCallback((r: RoomInfo) => setRoomInfo(r), []);
  const handleLeaveRoom  = useCallback(() => {
    if (isRecording) toggleRecording();
    clearTranscripts();
    setRoomInfo(null); setStoredFiles([]); setSelectedFileId(undefined); setShowChatbox(false);
  }, [isRecording, toggleRecording, clearTranscripts]);

  const copyRoomInfo = useCallback(() => {
    if (!roomInfo) return;
    safeClip(`Phòng họp Than AI\nMã phòng: ${roomInfo.roomId}\nMật khẩu: ${roomInfo.password}`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [roomInfo]);

  const exportTranscript = useCallback(() => {
    const finals = transcripts.filter((t) => t.isFinal);
    if (!finals.length) return;
    const lines = finals.map((t) => {
      const time = new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      return `[${time}] ${t.userName ?? t.userId ?? "Người nói"}: ${t.text}`;
    }).join("\n");
    const summaryBlock = summaries.length
      ? `\n\n${"─".repeat(50)}\nTÓM TẮT AI\n${"─".repeat(50)}\n${summaries.map((s, i) => `[#${i + 1}]\n${s.text}`).join("\n\n")}`
      : "";
    const header = `Than AI - Phòng Họp Thông Minh\nPhòng: ${roomInfo?.roomId ?? "N/A"}\nNgày: ${new Date().toLocaleDateString("vi-VN")}\nThời lượng: ${formatDuration(duration)}\n${"─".repeat(50)}\n\n`;
    const blob = new Blob([header + lines + summaryBlock], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `than-ai-banghi-${roomInfo?.roomId ?? "local"}-${Date.now()}.txt` });
    a.click(); URL.revokeObjectURL(url);
  }, [transcripts, summaries, duration, roomInfo]);

  const clearAll = useCallback(() => { clearTranscripts(); setStoredFiles([]); setSelectedFileId(undefined); }, [clearTranscripts]);

  const handleAddFile    = useCallback((f: StoredFile) => { setStoredFiles((p) => [...p, f]); setSelectedFileId(f.id); }, []);
  const handleSelectFile = useCallback((f: StoredFile) => setSelectedFileId(f.id), []);
  const handleRemoveFile = useCallback((id: string) => {
    setStoredFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      setSelectedFileId((cur) => {
        if (cur !== id) return cur;
        return next[next.length - 1]?.id;
      });
      return next;
    });
  }, []);
  const handlePdfLoaded = useCallback((name: string, numPages: number) => {
    setStoredFiles((p) => p.map((f) => f.name === name ? { ...f, numPages } : f));
  }, []);

  if (!roomInfo) return <RoomLobby onJoinRoom={handleJoinRoom} />;

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">

      {/* ── Header ── */}
      <header className="border-b border-border bg-card shrink-0 z-10">
        <div className="flex items-center justify-between px-4 py-2 lg:px-5">
          {/* Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-emerald-500/10 border border-primary/20">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="hidden sm:block min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="than-ai-gradient text-sm font-bold whitespace-nowrap">Than AI</h1>
                <span className="hidden md:inline text-xs text-muted-foreground">— Phòng Họp Thông Minh</span>
                <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{roomInfo.roomId}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Xin chào, {roomInfo.userName}</p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 shrink-0">
            <ConnectionBadge status={status} />
            {isRecording && <span className="font-mono text-sm tabular-nums">{formatDuration(duration)}</span>}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
            <button onClick={copyRoomInfo} title="Sao chép thông tin phòng"
              className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-2 py-1.5 text-xs font-medium transition-colors hover:bg-secondary/80">
              {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copied ? "Đã chép" : "Chia sẻ"}</span>
            </button>

            {transcripts.some((t) => t.isFinal) && (
              <button onClick={() => setShowPostMeeting(true)} title="Tổng kết cuộc họp"
                className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20">
                <ClipboardList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tổng kết</span>
              </button>
            )}

            <button onClick={exportTranscript} title="Xuất bản ghi"
              disabled={!transcripts.some((t) => t.isFinal)}
              className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-2 py-1.5 text-xs font-medium transition-colors hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Xuất</span>
            </button>

            <button onClick={clearAll} title="Xóa tất cả"
              disabled={transcripts.length === 0 && storedFiles.length === 0}
              className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-2 py-1.5 text-xs font-medium transition-colors hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed">
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Xóa</span>
            </button>

            <button onClick={() => setShowInsights((v) => !v)} title={showInsights ? "Ẩn trợ lý AI" : "Hiện trợ lý AI"}
              className={`hidden lg:flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                showInsights ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                : "border-border bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}>
              <Sparkles className="h-3.5 w-3.5" />
              <span>{showInsights ? "Ẩn AI" : "Trợ lý"}</span>
            </button>

            <button onClick={() => setShowChatbox((v) => !v)} title="Mở AI Chat"
              className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                showChatbox ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                : "border-border bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}>
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">AI Chat</span>
            </button>

            <ThemeToggle />

            <button onClick={handleLeaveRoom} title="Rời phòng họp"
              className="flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20">
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Rời</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Error banner ── */}
      {error && (
        <div className="px-4 pt-1.5 lg:px-5 shrink-0">
          <ErrorBanner message={error} onDismiss={dismissError} />
        </div>
      )}

      {/* ── Control bar ── */}
      <div className="border-b border-border bg-card/50 px-4 py-1.5 lg:px-5 shrink-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <RecordButton isRecording={isRecording} isConnecting={status === "connecting"} onToggle={toggleRecording} />
          <div className="flex-1 min-w-[80px] max-w-[160px]">
            <AudioVisualizer isActive={isRecording} analyserNode={analyserNode} />
          </div>
          {isRecording && <span className="text-xs text-muted-foreground">{currentLang?.label ?? config.language}</span>}
          {summaries.length > 0 && (
            <div className="hidden sm:flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2 py-0.5">
              <AlarmClock className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-medium">{summaries.length} tóm tắt</span>
            </div>
          )}
          <div className="ml-auto">
            <ConfigPanel config={config} onUpdate={updateConfig} disabled={isRecording} />
          </div>
        </div>
      </div>

      {/* ── Mobile: room info ── */}
      <div className="flex lg:hidden items-center justify-between border-b border-border bg-secondary/30 px-4 py-1.5 shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>Phòng: <span className="font-mono font-medium text-foreground">{roomInfo.roomId}</span></span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          <span>MK: <span className="font-mono font-medium text-foreground">{roomInfo.password}</span></span>
        </div>
      </div>

      {/* ── Mobile tab switcher ── */}
      <div className="flex lg:hidden border-b border-border bg-card shrink-0">
        {([
          { id: "transcript", icon: MessageSquare, label: "Bản ghi", badge: transcripts.filter((t) => t.isFinal).length },
          { id: "document",   icon: FileText,      label: "Tài liệu", badge: storedFiles.length },
          { id: "ai",         icon: Bot,           label: "Trợ lý AI", badge: summaries.length },
        ] as const).map(({ id, icon: Icon, label, badge }) => (
          <button key={id} onClick={() => setMobileTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
              mobileTab === id ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
            }`}>
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            {badge > 0 && <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold">{badge}</span>}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN 3-COLUMN LAYOUT: 30% | 40% | 30%
      ══════════════════════════════════════════════════════════════════ */}
      <main className="flex flex-1 overflow-hidden min-h-0">

        {/* ═══ LEFT 30%: Bản Ghi Trực Tiếp ════════════════════════════ */}
        <section className={`flex flex-col min-h-0 border-r border-border transition-all duration-300 ${
          showInsights ? "lg:w-[30%]" : "lg:w-[35%]"
        } ${mobileTab === "transcript" ? "flex w-full" : "hidden lg:flex"}`}>

          <div className="hidden lg:flex items-center justify-between border-b border-border px-3 py-2 bg-card/30 shrink-0">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bản Ghi Trực Tiếp</h2>
            </div>
            <div className="flex items-center gap-1">
              {summaries.length > 0 && (
                <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-medium text-emerald-400">
                  <AlarmClock className="h-2.5 w-2.5" />{summaries.length}
                </span>
              )}
              {transcripts.length > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary tabular-nums">
                  {transcripts.filter((t) => t.isFinal).length}c
                </span>
              )}
            </div>
          </div>

          <ChatTranscript
            entries={transcripts}
            isRecording={isRecording}
            currentUserId={roomInfo.userName}
            onFinalEntry={(entry) => triggerRetrievalQuery(entry.text)}
          />
        </section>

        {/* ═══ CENTER 40%: Khu Vực Tài Liệu ═══════════════════════════ */}
        <section className={`flex flex-col min-h-0 transition-all duration-300 ${
          showInsights ? "lg:w-[40%]" : "lg:w-[65%]"
        } ${mobileTab !== "transcript" && mobileTab !== "ai" ? "flex w-full" : "hidden lg:flex"} ${showInsights ? "border-r border-border" : ""}`}>

          {/* Column header */}
          <div className="hidden lg:flex items-center justify-between border-b border-border px-3 py-2 bg-card/30 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <FileText className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Khu Vực Tài Liệu</h2>
              {documentName && (
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400 truncate max-w-[80px]" title={documentName}>
                  {documentName}
                </span>
              )}
            </div>
            {/* Collapsible sidebar toggle — ChevronLeft hides, ChevronRight shows */}
            <button
              onClick={() => setShowFilePanel((v) => !v)}
              title={showFilePanel ? "Ẩn danh sách tài liệu" : "Hiện danh sách tài liệu"}
              className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-all ${
                showFilePanel
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  : "border-border bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {showFilePanel ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              <span>{showFilePanel ? "Ẩn" : "Tài liệu"} ({storedFiles.length})</span>
            </button>
          </div>

          {/* Horizontal split: collapsible file list + viewer */}
          <div className="flex flex-1 min-h-0 overflow-hidden">

            {/* Collapsible file-list sidebar — animated w-64→w-0 */}
            <div className={`hidden lg:flex flex-col shrink-0 overflow-hidden transition-all duration-300 border-r border-border ${
              showFilePanel ? "w-56" : "w-0 border-r-0"
            }`}>
              <DocumentSidebar
                files={storedFiles}
                selectedFileId={selectedFileId}
                onAddFile={handleAddFile}
                onSelectFile={handleSelectFile}
                onRemoveFile={handleRemoveFile}
              />
            </div>

            {/*
              KEY = selectedFileId forces DocumentViewer to UNMOUNT + REMOUNT on every
              file switch. This is the critical fix for "white screen" when switching files.
            */}
            <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
              <DocumentViewer
                key={selectedFileId ?? "empty"}
                externalFile={selectedFile}
                onDocumentLoaded={handlePdfLoaded}
                onDocumentCleared={() => setSelectedFileId(undefined)}
              />
            </div>
          </div>
        </section>

        {/* ═══ RIGHT 30%: Trợ lý Than AI ════════════════════════════ */}
        {showInsights && (
          <section className={`flex flex-col min-h-0 lg:w-[30%] shrink-0 ${mobileTab === "ai" ? "flex w-full" : "hidden lg:flex"}`}>
            <AIInsights
              transcripts={transcripts}
              isRecording={isRecording}
              documentName={documentName}
              documentNumPages={documentNumPages}
              summaries={summaries}
              onClose={() => setShowInsights(false)}
            />
          </section>
        )}

        {/* Collapsed AI hint strip */}
        {!showInsights && (
          <div className="hidden lg:flex flex-col w-10 border-l border-border bg-card/20 shrink-0">
            <button onClick={() => setShowInsights(true)} title="Mở Trợ lý Than AI"
              className="flex flex-col items-center gap-2 py-5 hover:bg-emerald-500/5 transition-colors group">
              <Sparkles className="h-4 w-4 text-muted-foreground group-hover:text-emerald-400" />
              <span className="text-[9px] font-medium text-muted-foreground group-hover:text-emerald-400 uppercase tracking-wider"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>Trợ lý AI</span>
            </button>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card/30 px-4 py-1 text-center shrink-0">
        <p className="text-[10px] text-muted-foreground">
          <kbd className="rounded border border-border bg-secondary px-1 py-0.5 font-mono text-[9px]">Space</kbd>{" "}
          bật/tắt ghi âm •{" "}
          <span className="than-ai-gradient font-semibold">Than AI - Phòng Họp Thông Minh</span>
          {" "}• {currentLang?.label ?? config.language}
        </p>
      </footer>

      {/* Post-meeting modal */}
      {showPostMeeting && roomInfo && (
        <PostMeetingSummary
          transcripts={transcripts}
          roomInfo={roomInfo}
          duration={duration}
          onClose={() => setShowPostMeeting(false)}
        />
      )}

      {/* AI Chatbox: fixed bottom-right */}
      {showChatbox && (
        <div className="fixed bottom-4 right-4 z-50 w-[360px] h-[520px] max-h-[calc(100vh-6rem)] shadow-2xl shadow-black/40 rounded-2xl">
          <AIChatbox
            transcripts={transcripts}
            documentName={documentName}
            onClose={() => setShowChatbox(false)}
          />
        </div>
      )}
    </div>
  );
}
