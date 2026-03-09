"use client";

import { useEffect, useCallback } from "react";
import { MeetingController } from "@/components/meeting/meeting-controller";

export default function Page() {
  /* Global keyboard shortcut: Space to toggle recording */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore when typing in inputs/textareas
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if (e.code === "Space") {
      e.preventDefault();
      // Dispatch a click on the record button
      const btn = document.querySelector<HTMLButtonElement>(
        'button[aria-label*="recording"]'
      );
      btn?.click();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return <MeetingController />;
}
