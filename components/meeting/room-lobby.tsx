"use client";

import { useState, useCallback } from "react";
import {
  Bot,
  Users,
  Lock,
  Plus,
  LogIn,
  Copy,
  Check,
  User,
  ArrowRight,
  Sparkles,
  Mic,
  FileText,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import type { RoomInfo } from "@/lib/stt-types";

interface RoomLobbyProps {
  onJoinRoom: (room: RoomInfo) => void;
}

function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generatePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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

const FEATURES = [
  { icon: Mic, label: "Phiên âm thời gian thực", color: "text-primary" },
  { icon: Sparkles, label: "AI Insights & Gợi ý ngữ cảnh", color: "text-chart-4" },
  { icon: Bot, label: "Chatbot AI hỏi đáp nội dung họp", color: "text-emerald-400" },
  { icon: FileText, label: "Xem tài liệu PDF song song", color: "text-chart-2" },
  { icon: Zap, label: "Tóm tắt tự động 3 phút/lần", color: "text-violet-400" },
];

export function RoomLobby({ onJoinRoom }: RoomLobbyProps) {
  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [userName, setUserName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newRoomId] = useState(() => generateRoomId());
  const [newPassword] = useState(() => generatePassword());

  const copyRoomInfo = useCallback(() => {
    const text = `Phòng họp Than AI\nMã phòng: ${newRoomId}\nMật khẩu: ${newPassword}`;
    safeWriteClipboard(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [newRoomId, newPassword]);

  const handleCreateRoom = useCallback(() => {
    if (!userName.trim()) { setError("Vui lòng nhập tên của bạn"); return; }
    onJoinRoom({ roomId: newRoomId, password: newPassword, createdAt: Date.now(), userName: userName.trim() });
  }, [userName, newRoomId, newPassword, onJoinRoom]);

  const handleJoinRoom = useCallback(() => {
    if (!userName.trim()) { setError("Vui lòng nhập tên của bạn"); return; }
    if (!roomId.trim()) { setError("Vui lòng nhập mã phòng"); return; }
    if (!password.trim()) { setError("Vui lòng nhập mật khẩu"); return; }
    onJoinRoom({ roomId: roomId.trim().toUpperCase(), password: password.trim(), createdAt: Date.now(), userName: userName.trim() });
  }, [userName, roomId, password, onJoinRoom]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {/* Theme toggle — top-right corner */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      {/* Background gradient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-chart-4/5 blur-[80px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo Section */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-chart-4/10 border border-primary/20 shadow-lg shadow-primary/10">
            <Bot className="h-10 w-10 text-primary" />
          </div>
          <h1 className="than-ai-gradient text-3xl font-bold tracking-tight">
            Than AI
          </h1>
          <p className="mt-1.5 text-sm font-medium text-muted-foreground">
            Phòng Họp Thông Minh
          </p>
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <span className="h-px w-8 bg-border" />
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">
              Powered by AI
            </span>
            <span className="h-px w-8 bg-border" />
          </div>
        </div>

        {/* Feature pills */}
        {mode === "select" && (
          <div className="mb-6 flex flex-wrap gap-1.5 justify-center">
            {FEATURES.map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-1 rounded-full border border-border bg-secondary/40 px-2.5 py-1">
                <Icon className={`h-3 w-3 ${color}`} />
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Mode Selection */}
        {mode === "select" && (
          <div className="space-y-3">
            <button
              onClick={() => setMode("create")}
              className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/10"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                <Plus className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Tạo phòng mới</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Bắt đầu cuộc họp thông minh với AI
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>

            <button
              onClick={() => setMode("join")}
              className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-chart-4/40 hover:bg-chart-4/5 hover:shadow-lg hover:shadow-chart-4/10"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-chart-4/10 border border-chart-4/20 group-hover:bg-chart-4/20 transition-colors">
                <LogIn className="h-7 w-7 text-chart-4" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Tham gia phòng</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Nhập mã phòng và mật khẩu để vào họp
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-chart-4 transition-colors" />
            </button>
          </div>
        )}

        {/* Create Form */}
        {mode === "create" && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/20">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">Tạo phòng mới</h2>
                <p className="text-xs text-muted-foreground">Chia sẻ thông tin phòng với người tham dự</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <User className="h-3.5 w-3.5" /> Tên của bạn
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => { setUserName(e.target.value); setError(null); }}
                  placeholder="Nhập tên hiển thị"
                  className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Thông tin phòng</span>
                  <button
                    onClick={copyRoomInfo}
                    className="flex items-center gap-1.5 rounded-lg bg-background border border-border px-2 py-1 text-xs font-medium hover:bg-secondary transition-colors"
                  >
                    {copied ? <><Check className="h-3 w-3 text-primary" /> Đã sao chép</> : <><Copy className="h-3 w-3" /> Sao chép</>}
                  </button>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" /> Mã phòng</span>
                    <span className="font-mono text-lg font-bold text-primary tracking-widest">{newRoomId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="h-4 w-4" /> Mật khẩu</span>
                    <span className="font-mono text-lg font-bold text-chart-4">{newPassword}</span>
                  </div>
                </div>
              </div>

              {error && <p className="text-xs font-medium text-destructive">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setMode("select")} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-secondary transition-colors">
                  Quay lại
                </button>
                <button onClick={handleCreateRoom} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                  Tạo phòng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Join Form */}
        {mode === "join" && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/20">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-4/10 border border-chart-4/20">
                <LogIn className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">Tham gia phòng</h2>
                <p className="text-xs text-muted-foreground">Nhập thông tin phòng được chia sẻ</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { label: "Tên của bạn", icon: User, value: userName, onChange: (v: string) => setUserName(v), placeholder: "Nhập tên hiển thị", mono: false },
                { label: "Mã phòng", icon: Users, value: roomId, onChange: (v: string) => setRoomId(v.toUpperCase()), placeholder: "VD: ABC123", mono: true, maxLength: 6 },
                { label: "Mật khẩu", icon: Lock, value: password, onChange: (v: string) => setPassword(v), placeholder: "Nhập mật khẩu", mono: true },
              ].map(({ label, icon: Icon, value, onChange, placeholder, mono, maxLength }) => (
                <div key={label}>
                  <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => { onChange(e.target.value); setError(null); }}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    className={`w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all ${mono ? "font-mono tracking-widest uppercase" : ""}`}
                  />
                </div>
              ))}

              {error && <p className="text-xs font-medium text-destructive">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setMode("select")} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-secondary transition-colors">
                  Quay lại
                </button>
                <button onClick={handleJoinRoom} className="flex-1 rounded-xl bg-chart-4 py-2.5 text-sm font-semibold text-background hover:bg-chart-4/90 transition-colors shadow-lg shadow-chart-4/20">
                  Tham gia
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Than AI • Mọi người có mật khẩu đều có thể tham gia phòng
        </p>
      </div>
    </div>
  );
}