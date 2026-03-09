"use client";

import { useState } from "react";
import {
  Settings2,
  Globe,
  Server,
  Monitor,
  ChevronDown,
  ChevronUp,
  Wifi,
  Cpu,
  Timer,
} from "lucide-react";
import type { STTConfig, STTMode } from "@/lib/stt-types";
import { SUPPORTED_LANGUAGES } from "@/lib/stt-types";

interface ConfigPanelProps {
  config: STTConfig;
  onUpdate: (patch: Partial<STTConfig>) => void;
  disabled: boolean;
}

export function ConfigPanel({ config, onUpdate, disabled }: ConfigPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-secondary/50"
      >
        <div className="flex items-center gap-2.5">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cấu Hình
          </span>
          {/* Mode badge */}
          <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-[10px] font-medium text-foreground">
            {config.mode === "browser" ? "Trình duyệt" : "Máy chủ"}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border px-5 py-5">
          <div className="flex flex-col gap-6">
            {/* Mode selector */}
            <fieldset disabled={disabled} className="flex flex-col gap-2.5">
              <legend className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Cpu className="h-3 w-3" />
                Chế độ STT
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: "browser", label: "Trình duyệt", icon: Monitor, desc: "Web Speech API" },
                    { value: "server", label: "Máy chủ", icon: Server, desc: "WebSocket PCM" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onUpdate({ mode: opt.value as STTMode })}
                    disabled={disabled}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                      config.mode === opt.value
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-secondary text-muted-foreground hover:border-muted-foreground/30"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <opt.icon className={`h-4 w-4 shrink-0 ${config.mode === opt.value ? "text-primary" : ""}`} />
                    <div>
                      <div className="text-sm font-medium">{opt.label}</div>
                      <div className="text-[10px] text-muted-foreground">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Language selector */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="cfg-lang"
                className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                <Globe className="h-3 w-3" />
                Ngôn ngữ
              </label>
              <select
                id="cfg-lang"
                value={config.language}
                onChange={(e) => onUpdate({ language: e.target.value })}
                disabled={disabled}
                className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Server-only settings */}
            {config.mode === "server" && (
              <>
                {/* WebSocket URL */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="cfg-ws-url"
                    className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    <Wifi className="h-3 w-3" />
                    Địa chỉ máy chủ WebSocket
                  </label>
                  <input
                    id="cfg-ws-url"
                    type="text"
                    value={config.wsUrl}
                    onChange={(e) => onUpdate({ wsUrl: e.target.value })}
                    disabled={disabled}
                    placeholder="ws://localhost:8080/ws/stt"
                    className="rounded-lg border border-border bg-secondary px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                {/* Chunk interval */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="cfg-chunk"
                    className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    <Timer className="h-3 w-3" />
                    Khoảng thời gian gửi: {config.chunkIntervalMs}ms
                  </label>
                  <input
                    id="cfg-chunk"
                    type="range"
                    min={100}
                    max={1000}
                    step={50}
                    value={config.chunkIntervalMs}
                    onChange={(e) =>
                      onUpdate({ chunkIntervalMs: Number(e.target.value) })
                    }
                    disabled={disabled}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>100ms (độ trễ thấp)</span>
                    <span>1000ms (theo lô)</span>
                  </div>
                </div>
              </>
            )}

            {/* Audio spec badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[
                "16 kHz",
                "Mono",
                "16-bit PCM",
                `${config.chunkIntervalMs}ms`,
              ].map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
