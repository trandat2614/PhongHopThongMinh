"use client";

import { useState, useCallback } from "react";
import {
  AudioWaveform,
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
} from "lucide-react";
import { useSTTRecorder } from "@/hooks/use-stt-recorder";
import { SUPPORTED_LANGUAGES, type ConnectionStatus, type RoomInfo } from "@/lib/stt-types";
import { AudioVisualizer } from "@/components/stt/audio-visualizer";
import { RecordButton } from "@/components/stt/record-button";
import { ErrorBanner } from "@/components/stt/error-banner";
import { ConfigPanel } from "@/components/stt/config-panel";
import { ChatTranscript } from "./chat-transcript";
import { DocumentViewer } from "./document-viewer";
import { RoomLobby } from "./room-lobby";

// Connection status badge - Vietnamese
function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const config: Record<ConnectionStatus, { icon: typeof Wifi; label: string; className: string }> = {
    idle: {
      icon: WifiOff,
      label: "Chua ket noi",
      className: "bg-muted text-muted-foreground",
    },
    connecting: {
      icon: Loader2,
      label: "Dang ket noi",
      className: "bg-chart-4/20 text-chart-4",
    },
    live: {
      icon: Radio,
      label: "Dang ghi am",
      className: "bg-primary/20 text-primary",
    },
    error: {
      icon: WifiOff,
      label: "Loi",
      className: "bg-destructive/20 text-destructive",
    },
  };

  const { icon: Icon, label, className } = config[status];

  return (
    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      <Icon className={`h-3 w-3 ${status === "connecting" ? "animate-spin" : status === "live" ? "animate-pulse" : ""}`} />
      <span>{label}</span>
    </div>
  );
}

// Format duration as MM:SS
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

type MobileTab = "transcript" | "document";

export function MeetingController() {
  // Room state
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [copied, setCopied] = useState(false);

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
  } = useSTTRecorder(
    roomInfo
      ? {
          roomId: roomInfo.roomId,
          roomPassword: roomInfo.password,
        }
      : undefined
  );

  const [documentCleared, setDocumentCleared] = useState(0);
  const [mobileTab, setMobileTab] = useState<MobileTab>("transcript");
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === config.language);

  // Join room handler
  const handleJoinRoom = useCallback((room: RoomInfo) => {
    setRoomInfo(room);
  }, []);

  // Leave room handler
  const handleLeaveRoom = useCallback(() => {
    if (isRecording) {
      toggleRecording(); // Stop recording first
    }
    clearTranscripts();
    setRoomInfo(null);
  }, [isRecording, toggleRecording, clearTranscripts]);

  // Copy room info
  const copyRoomInfo = useCallback(() => {
    if (!roomInfo) return;
    const text = `Phong hop VoxStream\nMa phong: ${roomInfo.roomId}\nMat khau: ${roomInfo.password}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [roomInfo]);

  // Export transcript
  const exportTranscript = useCallback(
    (format: "txt" | "docx") => {
      if (transcripts.length === 0) return;

      const lines = transcripts
        .filter((t) => t.isFinal)
        .map((t) => {
          const time = new Date(t.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          const speaker = t.userName ?? t.userId ?? "Nguoi noi";
          return `[${time}] ${speaker}: ${t.text}`;
        })
        .join("\n");

      const header = `VoxStream - Ban Ghi Cuoc Hop\nPhong: ${roomInfo?.roomId ?? "N/A"}\nNgay: ${new Date().toLocaleDateString("vi-VN")}\nNgon ngu: ${currentLang?.label ?? config.language}\nThoi luong: ${formatDuration(duration)}\n${"─".repeat(50)}\n\n`;
      const content = header + lines;

      if (format === "txt") {
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `voxstream-banghi-${roomInfo?.roomId ?? "local"}-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `voxstream-banghi-${roomInfo?.roomId ?? "local"}-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    [transcripts, currentLang, config.language, duration, roomInfo]
  );

  // Clear all
  const clearAll = useCallback(() => {
    clearTranscripts();
    setDocumentCleared((k) => k + 1);
  }, [clearTranscripts]);

  // Show lobby if not in a room
  if (!roomInfo) {
    return <RoomLobby onJoinRoom={handleJoinRoom} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shrink-0">
        <div className="flex items-center justify-between px-4 py-3 lg:px-6">
          {/* Logo + Room Info */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <AudioWaveform className="h-5 w-5 text-primary" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-foreground tracking-tight">
                  VoxStream
                </h1>
                <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-medium text-muted-foreground">
                  {roomInfo.roomId}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Xin chao, {roomInfo.userName}
              </p>
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
          <div className="flex items-center gap-2">
            {/* Copy room info */}
            <button
              onClick={copyRoomInfo}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80"
              title="Sao chep thong tin phong"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {copied ? "Da chep" : "Chia se"}
              </span>
            </button>

            {/* Export */}
            <button
              onClick={() => exportTranscript("txt")}
              disabled={transcripts.filter((t) => t.isFinal).length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Xuat ban ghi"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Xuat</span>
            </button>

            {/* Clear */}
            <button
              onClick={clearAll}
              disabled={transcripts.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Xoa tat ca"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Xoa</span>
            </button>

            {/* Leave room */}
            <button
              onClick={handleLeaveRoom}
              className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
              title="Roi phong"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Roi</span>
            </button>
          </div>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="px-4 pt-4 lg:px-6">
          <ErrorBanner message={error} onDismiss={dismissError} />
        </div>
      )}

      {/* Control bar */}
      <div className="border-b border-border bg-card/50 px-4 py-3 lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Visualizer + Record */}
          <div className="flex items-center gap-4">
            <RecordButton
              isRecording={isRecording}
              isConnecting={status === "connecting"}
              onToggle={toggleRecording}
            />
            <div className="flex-1 min-w-[120px] max-w-[200px]">
              <AudioVisualizer isActive={isRecording} analyserNode={analyserNode} />
            </div>
            {isRecording && (
              <span className="text-xs text-muted-foreground">
                {currentLang?.label ?? config.language}
              </span>
            )}
          </div>

          {/* Right: Config */}
          <ConfigPanel config={config} onUpdate={updateConfig} disabled={isRecording} />
        </div>
      </div>

      {/* Room info banner (mobile) */}
      <div className="flex lg:hidden items-center justify-between border-b border-border bg-secondary/30 px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>Phong: <span className="font-mono font-medium text-foreground">{roomInfo.roomId}</span></span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          <span>Mat khau: <span className="font-mono font-medium text-foreground">{roomInfo.password}</span></span>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden border-b border-border bg-card shrink-0">
        <button
          onClick={() => setMobileTab("transcript")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            mobileTab === "transcript"
              ? "text-primary border-b-2 border-primary bg-primary/5"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Ban ghi</span>
          {transcripts.filter((t) => t.isFinal).length > 0 && (
            <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
              {transcripts.filter((t) => t.isFinal).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setMobileTab("document")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            mobileTab === "document"
              ? "text-chart-2 border-b-2 border-chart-2 bg-chart-2/5"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Tai lieu</span>
        </button>
      </div>

      {/* Main content */}
      <main className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Left panel: Transcript */}
        <section
          className={`flex flex-1 flex-col border-b border-border lg:border-b-0 lg:border-r min-h-0 ${
            mobileTab === "transcript" ? "flex" : "hidden lg:flex"
          }`}
        >
          {/* Desktop header */}
          <div className="hidden lg:flex items-center justify-between border-b border-border px-4 py-2.5 bg-card/30 shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ban Ghi Truc Tiep
              </h2>
            </div>
            {transcripts.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary tabular-nums">
                {transcripts.filter((t) => t.isFinal).length} tin nhan
              </span>
            )}
          </div>

          <ChatTranscript
            entries={transcripts}
            isRecording={isRecording}
            currentUserId={roomInfo.userName}
          />
        </section>

        {/* Right panel: Document */}
        <section
          className={`flex flex-1 flex-col min-h-0 ${
            mobileTab === "document" ? "flex" : "hidden lg:flex"
          }`}
        >
          {/* Desktop header */}
          <div className="hidden lg:flex items-center gap-2 border-b border-border px-4 py-2.5 bg-card/30 shrink-0">
            <FileText className="h-4 w-4 text-chart-2" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tai Lieu Tham Khao
            </h2>
          </div>

          <DocumentViewer key={documentCleared} />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 px-4 py-2 text-center shrink-0">
        <p className="text-[10px] text-muted-foreground">
          Nhan{" "}
          <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[9px]">
            Space
          </kbd>{" "}
          de bat/tat ghi am • Tai lieu duoc xu ly cuc bo
        </p>
      </footer>
    </div>
  );
}
