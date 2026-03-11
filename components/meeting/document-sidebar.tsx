"use client";

import { useRef, useCallback } from "react";
import {
  Plus,
  FileText,
  FileType2,
  Eye,
  Trash2,
  BookOpen,
  FolderOpen,
} from "lucide-react";

export interface StoredFile {
  id: string;
  name: string;
  type: "pdf" | "docx" | "doc" | "txt";
  /** Raw browser File object — passed to DocumentViewer for native processing */
  rawFile: File;
  content?: string;   // pre-extracted text for non-PDF types
  numPages?: number;
  size: number;
}

interface DocumentSidebarProps {
  files: StoredFile[];
  selectedFileId?: string;
  onAddFile: (file: StoredFile) => void;
  onSelectFile: (file: StoredFile) => void;
  onRemoveFile: (id: string) => void;
}

const ACCEPTED = ".pdf,.docx,.doc,.txt";

function getFileIcon(type: StoredFile["type"]) {
  if (type === "pdf") return <FileText className="h-3.5 w-3.5 text-chart-5" />;
  if (type === "docx" || type === "doc") return <FileType2 className="h-3.5 w-3.5 text-chart-2" />;
  return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
}

function getTypeBadge(type: StoredFile["type"]) {
  const cfg: Record<StoredFile["type"], { label: string; cls: string }> = {
    pdf: { label: "PDF", cls: "bg-chart-5/15 text-chart-5" },
    docx: { label: "DOCX", cls: "bg-chart-2/15 text-chart-2" },
    doc: { label: "DOC", cls: "bg-chart-2/15 text-chart-2" },
    txt: { label: "TXT", cls: "bg-muted text-muted-foreground" },
  };
  const { label, cls } = cfg[type];
  return (
    <span className={`rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function DocumentSidebar({
  files,
  selectedFileId,
  onAddFile,
  onSelectFile,
  onRemoveFile,
}: DocumentSidebarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (rawFile: File) => {
      const ext = rawFile.name.split(".").pop()?.toLowerCase() as StoredFile["type"] | undefined;
      if (!ext || !["pdf", "docx", "doc", "txt"].includes(ext)) return;

      const id = `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      let content = "";

      try {
        if (ext === "txt") {
          content = await rawFile.text();
        } else if (ext === "docx") {
          const mammoth = await import("mammoth");
          const buf = await rawFile.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer: buf });
          content = result.value;
        } else if (ext === "doc") {
          content = await rawFile.text();
        }
        // For PDF: no pre-processing needed; DocumentViewer handles it

        const stored: StoredFile = {
          id,
          name: rawFile.name,
          type: ext as StoredFile["type"],
          rawFile,
          content,
          size: rawFile.size,
        };
        onAddFile(stored);
      } catch {
        // silently ignore on error
      }
    },
    [onAddFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [processFile]
  );

  return (
    <aside className="flex flex-col h-full bg-card border-r border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
            <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[11px] font-bold text-foreground leading-tight truncate">
              Tài Liệu Cuộc Họp
            </h2>
          </div>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors shrink-0"
          title="Thêm tài liệu"
        >
          <Plus className="h-3 w-3" />
          <span>Thêm</span>
        </button>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary">
              <FolderOpen className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed px-2">
              Chưa có tài liệu. Nhấn{" "}
              <button
                onClick={() => inputRef.current?.click()}
                className="text-emerald-400 font-semibold underline underline-offset-2"
              >
                + Thêm
              </button>{" "}
              để tải lên.
            </p>
          </div>
        ) : (
          files.map((file) => {
            const isSelected = file.id === selectedFileId;
            return (
              <div
                key={file.id}
                className={`group rounded-lg border p-2 transition-all cursor-pointer ${
                  isSelected
                    ? "border-emerald-500/40 bg-emerald-500/8 shadow-sm shadow-emerald-500/10"
                    : "border-border bg-secondary/30 hover:border-border/70 hover:bg-secondary/60"
                }`}
                onClick={() => onSelectFile(file)}
              >
                {/* File info row */}
                <div className="flex items-start gap-2 mb-1.5">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5 ${
                      isSelected ? "bg-emerald-500/15" : "bg-secondary"
                    }`}
                  >
                    {getFileIcon(file.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[11px] font-medium leading-tight truncate ${
                        isSelected ? "text-emerald-400" : "text-foreground"
                      }`}
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {getTypeBadge(file.type)}
                      <span className="text-[9px] text-muted-foreground font-mono">
                        {formatSize(file.size)}
                      </span>
                      {file.numPages && (
                        <span className="text-[9px] text-muted-foreground">
                          {file.numPages}tr
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectFile(file);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 rounded-md py-1 text-[10px] font-medium transition-colors ${
                      isSelected
                        ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    }`}
                  >
                    <Eye className="h-3 w-3" />
                    Xem
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(file.id);
                    }}
                    className="flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Xóa tài liệu"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer count */}
      {files.length > 0 && (
        <div className="px-3 py-1.5 border-t border-border bg-secondary/20 shrink-0">
          <p className="text-[9px] text-muted-foreground text-center">
            {files.length} tài liệu
          </p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={handleFileInput}
        className="hidden"
        aria-label="Thêm tài liệu"
      />
    </aside>
  );
}
