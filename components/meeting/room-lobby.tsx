"use client";

import { useState, useCallback } from "react";
import {
  AudioWaveform,
  Users,
  Lock,
  Plus,
  LogIn,
  Copy,
  Check,
  User,
  ArrowRight,
} from "lucide-react";
import type { RoomInfo } from "@/lib/stt-types";

interface RoomLobbyProps {
  onJoinRoom: (room: RoomInfo) => void;
}

/** Generate a random room ID */
function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/** Generate a random password */
function generatePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function RoomLobby({ onJoinRoom }: RoomLobbyProps) {
  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [userName, setUserName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For create mode, pre-generate room ID and password
  const [newRoomId] = useState(() => generateRoomId());
  const [newPassword] = useState(() => generatePassword());

  const copyRoomInfo = useCallback(() => {
    const text = `Phong hop VoxStream\nMa phong: ${newRoomId}\nMat khau: ${newPassword}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [newRoomId, newPassword]);

  const handleCreateRoom = useCallback(() => {
    if (!userName.trim()) {
      setError("Vui long nhap ten cua ban");
      return;
    }
    onJoinRoom({
      roomId: newRoomId,
      password: newPassword,
      createdAt: Date.now(),
      userName: userName.trim(),
    });
  }, [userName, newRoomId, newPassword, onJoinRoom]);

  const handleJoinRoom = useCallback(() => {
    if (!userName.trim()) {
      setError("Vui long nhap ten cua ban");
      return;
    }
    if (!roomId.trim()) {
      setError("Vui long nhap ma phong");
      return;
    }
    if (!password.trim()) {
      setError("Vui long nhap mat khau");
      return;
    }
    onJoinRoom({
      roomId: roomId.trim().toUpperCase(),
      password: password.trim(),
      createdAt: Date.now(),
      userName: userName.trim(),
    });
  }, [userName, roomId, password, onJoinRoom]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <AudioWaveform className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            VoxStream
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Phong hop chuyen giong noi thanh van ban
          </p>
        </div>

        {/* Mode selection */}
        {mode === "select" && (
          <div className="space-y-4">
            <button
              onClick={() => setMode("create")}
              className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-secondary"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Tao phong moi</h3>
                <p className="text-sm text-muted-foreground">
                  Tao phong hop va moi nguoi khac tham gia
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button
              onClick={() => setMode("join")}
              className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-secondary"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-chart-2/10">
                <LogIn className="h-6 w-6 text-chart-2" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Tham gia phong</h3>
                <p className="text-sm text-muted-foreground">
                  Nhap ma phong va mat khau de tham gia
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Create room form */}
        {mode === "create" && (
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Tao phong moi</h2>
                <p className="text-xs text-muted-foreground">
                  Chia se thong tin phong cho nguoi khac
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* User name */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <User className="h-3 w-3" />
                  Ten cua ban
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value);
                    setError(null);
                  }}
                  placeholder="Nhap ten hien thi"
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-primary"
                />
              </div>

              {/* Room info card */}
              <div className="rounded-lg border border-border bg-secondary/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Thong tin phong
                  </span>
                  <button
                    onClick={copyRoomInfo}
                    className="flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-border"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-primary" />
                        Da sao chep
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Sao chep
                      </>
                    )}
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      Ma phong
                    </span>
                    <span className="font-mono text-lg font-bold tracking-wider text-foreground">
                      {newRoomId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Lock className="h-4 w-4" />
                      Mat khau
                    </span>
                    <span className="font-mono text-lg font-bold tracking-wider text-foreground">
                      {newPassword}
                    </span>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setMode("select")}
                  className="flex-1 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-border"
                >
                  Quay lai
                </button>
                <button
                  onClick={handleCreateRoom}
                  className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Tao phong
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Join room form */}
        {mode === "join" && (
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                <LogIn className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Tham gia phong</h2>
                <p className="text-xs text-muted-foreground">
                  Nhap thong tin phong duoc chia se
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* User name */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <User className="h-3 w-3" />
                  Ten cua ban
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value);
                    setError(null);
                  }}
                  placeholder="Nhap ten hien thi"
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-primary"
                />
              </div>

              {/* Room ID */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Users className="h-3 w-3" />
                  Ma phong
                </label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => {
                    setRoomId(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  placeholder="VD: ABC123"
                  maxLength={6}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 font-mono text-sm uppercase tracking-wider text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-primary"
                />
              </div>

              {/* Password */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Mat khau
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Nhap mat khau phong"
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-primary"
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setMode("select")}
                  className="flex-1 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-border"
                >
                  Quay lai
                </button>
                <button
                  onClick={handleJoinRoom}
                  className="flex-1 rounded-lg bg-chart-2 px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-chart-2/90"
                >
                  Tham gia
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Moi nguoi co mat khau deu co the tham gia phong
        </p>
      </div>
    </div>
  );
}
