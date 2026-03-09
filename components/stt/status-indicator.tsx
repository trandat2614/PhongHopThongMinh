"use client";

import { Wifi, WifiOff, Loader2 } from "lucide-react";
import type { StatusIndicatorProps } from "@/lib/stt-types";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function StatusIndicator({ status, duration }: StatusIndicatorProps) {
  const config = {
    idle: {
      icon: <WifiOff className="h-3.5 w-3.5" />,
      label: "Ngoại tuyến",
      dotClass: "bg-muted-foreground",
      textClass: "text-muted-foreground",
    },
    connecting: {
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      label: "Đang kết nối",
      dotClass: "bg-chart-4",
      textClass: "text-chart-4",
    },
    live: {
      icon: <Wifi className="h-3.5 w-3.5" />,
      label: "Trực tiếp",
      dotClass: "bg-primary",
      textClass: "text-primary",
    },
    error: {
      icon: <WifiOff className="h-3.5 w-3.5" />,
      label: "Lỗi",
      dotClass: "bg-destructive",
      textClass: "text-destructive",
    },
  } as const;

  const c = config[status];

  return (
    <div className="flex items-center gap-3">
      {/* Status badge */}
      <div
        className={`flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 ${c.textClass}`}
      >
        {/* Animated dot */}
        <span className="relative flex h-2 w-2">
          {status === "live" && (
            <span
              className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"
              style={{ animation: "pulse-ring 1.5s cubic-bezier(0,0,0.2,1) infinite" }}
            />
          )}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${c.dotClass}`} />
        </span>

        {c.icon}

        <span className="text-xs font-medium uppercase tracking-wider">
          {c.label}
        </span>
      </div>

      {/* Timer */}
      {status === "live" && (
        <div className="font-mono text-sm tabular-nums text-muted-foreground">
          {formatDuration(duration)}
        </div>
      )}
    </div>
  );
}
