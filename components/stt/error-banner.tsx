"use client";

import { AlertTriangle, X } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <p className="flex-1 text-sm text-destructive">{message}</p>
      <button
        onClick={onDismiss}
        aria-label="Bỏ qua lỗi"
        className="shrink-0 rounded-md p-0.5 text-destructive/60 transition-colors hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
