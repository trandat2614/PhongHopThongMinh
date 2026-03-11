"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload,
  X,
  AlertCircle,
  Loader2,
  FileIcon,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileText,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { StoredFile } from "./document-sidebar";

// ── PDF.js worker via CDN — avoids local bundle issues ──
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentViewerProps {
  onClear?: () => void;
  onDocumentLoaded?: (name: string, numPages: number) => void;
  onDocumentCleared?: () => void;
  externalFile?: StoredFile | null;
  /** Pass selectedFile.id as the key on the parent so this component unmounts/remounts on file switch */
  fileKey?: string;
}

type DocType = "txt" | "doc" | "docx" | "pdf";

interface DocState {
  name: string;
  content: string;
  rawFile?: File;  // PDF: passed directly to react-pdf — no blob URL needed
  type: DocType;
}

const ACCEPTED = [".txt", ".doc", ".docx", ".pdf"];

// ── Inner viewer — receives a stable fileKey to allow parent to force remount ──
export function DocumentViewer({
  onClear,
  onDocumentLoaded,
  onDocumentCleared,
  externalFile,
}: DocumentViewerProps) {
  const [doc, setDoc] = useState<DocState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // PDF state
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [pageWidth, setPageWidth] = useState<number | undefined>(undefined);

  const viewerRef = useRef<HTMLDivElement>(null);

  // Measure container width every render (no stale deps issue)
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setPageWidth(Math.max(w - 48, 200));
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }); // intentionally no dep array

  // Clean up blob URL when doc changes or component unmounts
  const blobUrlRef = useRef<string>("");
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = "";
      }
    };
  }, [doc]);

  const processFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setNumPages(null);
    setCurrentPage(1);
    setZoom(1.0);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "pdf") {
        // Pass File directly — react-pdf accepts File natively via ArrayBuffer,
        // no HTTP fetch = no "Unexpected server response (0)" error
        setDoc({ name: file.name, content: "", rawFile: file, type: "pdf" });
      } else if (ext === "txt") {
        setDoc({ name: file.name, content: await file.text(), rawFile: file, type: "txt" });
      } else if (ext === "docx") {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        setDoc({ name: file.name, content: result.value, rawFile: file, type: "docx" });
      } else if (ext === "doc") {
        setError("File .doc cũ có hỗ trợ hạn chế. Vui lòng chuyển sang .docx, .pdf hoặc .txt.");
        const text = await file.text();
        setDoc({ name: file.name, content: text.replace(/[^\x20-\x7E\n\r\t]/g, " "), rawFile: file, type: "doc" });
      } else {
        setError("Định dạng không được hỗ trợ. Vui lòng dùng .pdf, .txt, .doc, hoặc .docx.");
      }
    } catch (err) {
      setError(`Không thể đọc file: ${err instanceof Error ? err.message : "Lỗi không xác định"}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Track the last loaded externalFile to avoid re-processing on identical reference
  const lastExternalId = useRef<string>("");
  useEffect(() => {
    if (!externalFile) return;
    const id = externalFile.id;
    if (id === lastExternalId.current) return;
    lastExternalId.current = id;
    processFile(externalFile.rawFile);
  }, [externalFile, processFile]);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const clearDoc = useCallback(() => {
    setDoc(null);
    setError(null);
    setNumPages(null);
    setCurrentPage(1);
    setZoom(1.0);
    lastExternalId.current = "";
    onClear?.();
    onDocumentCleared?.();
  }, [onClear, onDocumentCleared]);

  const onPdfLoaded = useCallback(
    ({ numPages: n }: { numPages: number }) => {
      setNumPages(n);
      if (doc?.name) onDocumentLoaded?.(doc.name, n);
    },
    [doc?.name, onDocumentLoaded]
  );

  const onPdfError = useCallback((err: Error) => {
    setError(`Không thể tải PDF: ${err.message}`);
  }, []);

  const goTo = (p: number) => setCurrentPage(Math.max(1, Math.min(p, numPages ?? 1)));
  const scaledWidth = pageWidth ? pageWidth * zoom : undefined;

  // ── EMPTY STATE ──────────────────────────────────────────────────────────
  if (!doc && !isLoading) {
    return (
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-primary/5 shrink-0">
          <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
          <p className="text-[10px] text-muted-foreground">
            <span className="font-medium text-foreground">Bảo mật:</span>{" "}
            File xử lý hoàn toàn cục bộ — không tải lên máy chủ.
          </p>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
          onClick={() => inputRef.current?.click()}
          role="button"
          aria-label="Tải lên tài liệu"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          className={`flex flex-1 flex-col items-center justify-center gap-4 p-6 m-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
            isDragOver
              ? "border-primary bg-primary/10"
              : "border-border hover:border-muted-foreground/40 hover:bg-secondary/20"
          }`}
        >
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
            isDragOver ? "bg-primary/20" : "bg-secondary border border-border"
          }`}>
            <Upload className={`h-6 w-6 ${isDragOver ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">
              {isDragOver ? "Thả file tại đây" : "Tải lên tài liệu"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Kéo thả hoặc nhấp để chọn</p>
            <p className="mt-1.5 text-[10px] text-muted-foreground/60">Hỗ trợ: .pdf  .docx  .txt  .doc</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            onChange={handleFileInput}
            className="hidden"
            aria-label="Tải lên tài liệu"
          />
        </div>

        {error && (
          <div className="mx-3 mb-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 shrink-0">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // ── PROCESSING ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Đang xử lý tài liệu...</p>
      </div>
    );
  }

  // ── PDF VIEWER ───────────────────────────────────────────────────────────
  if (doc?.type === "pdf") {
    return (
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-secondary/30 px-3 py-1.5 shrink-0">
          {/* File info */}
          <div className="flex items-center gap-1.5 min-w-0 mr-auto">
            <FileText className="h-3.5 w-3.5 text-chart-5 shrink-0" />
            <span className="text-[11px] font-medium truncate max-w-[100px]" title={doc.name}>{doc.name}</span>
            <span className="text-[9px] text-muted-foreground font-mono shrink-0">
              {numPages ? `${numPages} trang` : "Đang tải..."}
            </span>
          </div>

          {/* Page nav */}
          <div className="flex items-center rounded border border-border overflow-hidden">
            <button onClick={() => goTo(currentPage - 1)} disabled={currentPage <= 1}
              aria-label="Trang trước"
              className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1.5 border-x border-border bg-card tabular-nums">
              {currentPage}/{numPages ?? "…"}
            </span>
            <button onClick={() => goTo(currentPage + 1)} disabled={currentPage >= (numPages ?? 1)}
              aria-label="Trang tiếp"
              className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center rounded border border-border overflow-hidden">
            <button onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.2).toFixed(1)))} disabled={zoom <= 0.4}
              aria-label="Thu nhỏ"
              title="Thu nhỏ"
              className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1.5 border-x border-border bg-card tabular-nums min-w-[36px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(1)))} disabled={zoom >= 3}
              aria-label="Phóng to"
              title="Phóng to"
              className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          <button onClick={() => setZoom(1.0)}
            title="Vừa khung"
            className="flex h-6 items-center gap-1 rounded border border-border px-1.5 text-[10px] text-muted-foreground hover:bg-secondary transition-colors">
            <Maximize2 className="h-3 w-3" />
            <span>Vừa khung</span>
          </button>

          <button onClick={clearDoc} aria-label="Đóng tài liệu" title="Đóng tài liệu"
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* PDF scroll container — MUST have flex-1 min-h-0 to stay inside panel */}
        <div
          ref={viewerRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-auto bg-muted/20"
          style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--border)) transparent" }}
        >
          {/*
            KEY = doc.name + zoom ensures react-pdf unmounts/remounts when file changes.
            This fixes the "white screen" when switching between files.
          */}
          <Document
            key={doc.name}
            file={doc.rawFile}
            onLoadSuccess={onPdfLoaded}
            onLoadError={onPdfError}
            loading={
              <div className="flex flex-col items-center justify-center gap-3 py-24">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Đang tải PDF...</p>
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-6">
                <AlertCircle className="h-10 w-10 text-destructive" />
                <p className="text-sm font-medium text-destructive">Không thể tải PDF</p>
                <p className="text-xs text-muted-foreground">File có thể bị lỗi hoặc không được hỗ trợ.</p>
              </div>
            }
            className="flex flex-col items-center py-6 gap-4 min-w-full"
          >
            {/* Current page only — prevents blank-render on large files */}
            <Page
              key={`${currentPage}-${zoom}`}
              pageNumber={currentPage}
              width={scaledWidth}
              loading={
                <div
                  className="flex items-center justify-center bg-white rounded shadow-lg"
                  style={{ width: scaledWidth ?? 600, height: (scaledWidth ?? 600) * 1.41 }}
                >
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              }
              className="shadow-lg rounded overflow-hidden bg-white"
            />
          </Document>
        </div>

        {error && (
          <div className="mx-3 my-1.5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 shrink-0">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // ── TEXT / DOCX / DOC ────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border bg-secondary/30 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <FileIcon className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" title={doc?.name}>{doc?.name}</p>
            <p className="text-[10px] text-muted-foreground uppercase">
              Tài liệu {doc?.type?.toUpperCase()} • Xử lý cục bộ
            </p>
          </div>
        </div>
        <button onClick={clearDoc} aria-label="Đóng tài liệu" title="Đóng tài liệu"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>

      {doc?.type === "doc" && error && (
        <div className="flex items-start gap-2 px-3 py-2 border-b border-border bg-chart-5/10 shrink-0">
          <AlertCircle className="h-3.5 w-3.5 text-chart-5 shrink-0 mt-0.5" />
          <p className="text-[10px] text-chart-5">{error}</p>
        </div>
      )}

      <div
        className="flex-1 min-h-0 overflow-y-auto p-4"
        style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--border)) transparent" }}
      >
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
          {doc?.content}
        </pre>
      </div>
    </div>
  );
}
