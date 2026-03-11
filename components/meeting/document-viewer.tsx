"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  FileText,
  Upload,
  X,
  AlertCircle,
  Loader2,
  FileIcon,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { StoredFile } from "./document-sidebar";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentViewerProps {
  onClear?: () => void;
  onDocumentLoaded?: (name: string, numPages: number) => void;
  onDocumentCleared?: () => void;
  externalFile?: StoredFile | null;
}

type DocumentType = "txt" | "doc" | "docx" | "pdf";

interface DocumentState {
  name: string;
  content: string;
  blobUrl: string;
  type: DocumentType;
}

const ACCEPTED_EXTENSIONS = [".txt", ".doc", ".docx", ".pdf"];

export function DocumentViewer({ onClear, onDocumentLoaded, onDocumentCleared, externalFile }: DocumentViewerProps) {
  const [preSummary, setPreSummary] = useState<string>(
    "Tóm tắt tài liệu sẽ xuất hiện ở đây sau khi bạn tải lên. AI sẽ phân tích nội dung và đưa ra các điểm chính."
  );
  const [document, setDocument] = useState<DocumentState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // PDF state
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Measure the scroll-container width for responsive PDF page width
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      // padding 32px each side
      setContainerWidth(Math.max(el.clientWidth - 64, 200));
    });
    obs.observe(el);
    setContainerWidth(Math.max(el.clientWidth - 64, 200));
    return () => obs.disconnect();
  }, [document]);

  // Clean up blob URL on unmount / document change
  useEffect(() => {
    return () => {
      if (document?.blobUrl) URL.revokeObjectURL(document.blobUrl);
    };
  }, [document?.blobUrl]);

  const processFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setNumPages(null);
    setCurrentPage(1);
    setZoom(1.0);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "pdf") {
        const blobUrl = URL.createObjectURL(file);
        setDocument({ name: file.name, content: "", blobUrl, type: "pdf" });
      } else if (ext === "txt") {
        setDocument({ name: file.name, content: await file.text(), blobUrl: "", type: "txt" });
      } else if (ext === "docx") {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        setDocument({ name: file.name, content: result.value, blobUrl: "", type: "docx" });
      } else if (ext === "doc") {
        setError("File .doc cũ có hỗ trợ hạn chế. Vui lòng chuyển sang .docx, .pdf hoặc .txt.");
        const text = await file.text();
        const cleaned = text.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ");
        setDocument({ name: file.name, content: cleaned, blobUrl: "", type: "doc" });
      } else {
        setError("Loại file không được hỗ trợ. Vui lòng tải lên .pdf, .txt, .doc hoặc .docx.");
      }
    } catch (err) {
      setError(`Không thể đọc file: ${err instanceof Error ? err.message : "Lỗi không xác định"}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // React to externalFile changes — use the same processFile pipeline
  useEffect(() => {
    if (!externalFile) return;
    processFile(externalFile.rawFile);
  }, [externalFile, processFile]);

  const handleFileSelect = useCallback(
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

  const clearDocument = useCallback(() => {
    if (document?.blobUrl) URL.revokeObjectURL(document.blobUrl);
    setDocument(null);
    setError(null);
    setNumPages(null);
    setCurrentPage(1);
    setZoom(1.0);
    setPreSummary("Tóm tắt tài liệu sẽ xuất hiện ở đây sau khi bạn tải lên. AI sẽ phân tích nội dung và đưa ra các điểm chính.");
    onClear?.();
    onDocumentCleared?.();
  }, [document?.blobUrl, onClear, onDocumentCleared]);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      if (document?.name) {
        onDocumentLoaded?.(document.name, numPages);
        setPreSummary("");
        setTimeout(() => {
          setPreSummary(
            `Tài liệu "${document.name}" có ${numPages} trang. AI đã phân tích cấu trúc. ` +
              "Insights sẽ được kích hoạt tự động khi nội dung hội thoại liên quan đến tài liệu này."
          );
        }, 1200);
      }
    },
    [document?.name, onDocumentLoaded]
  );

  const onDocumentLoadError = useCallback((err: Error) => {
    setError(`Không thể tải PDF: ${err.message}`);
  }, []);

  const zoomIn  = useCallback(() => setZoom((z) => Math.min(z + 0.2, 3)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.2, 0.4)), []);
  const fitWidth = useCallback(() => setZoom(1.0), []);
  const goToPage = useCallback((p: number) => setCurrentPage(Math.max(1, Math.min(p, numPages ?? 1))), [numPages]);

  // ── EMPTY STATE ──────────────────────────────────────────────────────────
  if (!document && !isLoading) {
    return (
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        {/* Privacy notice */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-primary/5 shrink-0">
          <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
          <p className="text-[10px] text-muted-foreground">
            <span className="font-medium text-foreground">Bảo mật:</span> File được xử lý cục bộ trong trình duyệt. Không tải lên máy chủ.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-1 flex-col items-center justify-center gap-4 p-6 m-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
            isDragOver ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/50 hover:bg-secondary/30"
          }`}
        >
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${isDragOver ? "bg-primary/20" : "bg-secondary border border-border"}`}>
            <Upload className={`h-6 w-6 ${isDragOver ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">{isDragOver ? "Thả file tại đây" : "Tải lên tài liệu"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Kéo thả hoặc nhấp để chọn file</p>
            <p className="mt-1.5 text-[10px] text-muted-foreground/70">Hỗ trợ: .pdf, .txt, .doc, .docx</p>
          </div>
          <input ref={inputRef} type="file" accept={ACCEPTED_EXTENSIONS.join(",")}
            onChange={handleFileSelect} className="hidden" aria-label="Tải lên tài liệu" />
        </div>

        {error && (
          <div className="mx-3 mb-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // ── LOADING STATE ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Đang xử lý tài liệu...</p>
      </div>
    );
  }

  // ── PDF VIEWER ───────────────────────────────────────────────────────────
  if (document?.type === "pdf") {
    const pageWidth = containerWidth > 0 ? containerWidth * zoom : undefined;

    return (
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">

        {/* AI pre-summary strip — fixed height, never overflows */}
        <div className="border-b border-border bg-violet-500/5 px-3 py-2 shrink-0">
          <span className="text-[9px] font-bold uppercase tracking-wider text-violet-400">✦ Tóm tắt AI</span>
          <div className="mt-1">
            {preSummary === "" ? (
              <div className="space-y-1 animate-pulse">
                <div className="h-2 rounded bg-violet-500/20 w-full" />
                <div className="h-2 rounded bg-violet-500/20 w-4/5" />
                <div className="h-2 rounded bg-violet-500/20 w-3/5" />
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{preSummary}</p>
            )}
          </div>
        </div>

        {/* PDF toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/30 px-3 py-1.5 shrink-0">
          {/* File info */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-chart-5/20 shrink-0">
              <FileText className="h-3.5 w-3.5 text-chart-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate max-w-[120px]">{document.name}</p>
              <p className="text-[9px] text-muted-foreground font-mono">PDF • {numPages ? `${numPages} trang` : "…"}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Page navigation */}
            <div className="flex items-center gap-0.5 border border-border rounded-md overflow-hidden">
              <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}
                className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] font-mono px-1.5 border-x border-border bg-card text-foreground tabular-nums">
                {currentPage}/{numPages ?? "…"}
              </span>
              <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= (numPages ?? 1)}
                className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Zoom */}
            <div className="flex items-center gap-0.5 border border-border rounded-md overflow-hidden">
              <button onClick={zoomOut} disabled={zoom <= 0.4}
                className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] font-mono px-1.5 border-x border-border bg-card text-foreground tabular-nums min-w-[36px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button onClick={zoomIn} disabled={zoom >= 3}
                className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Fit / close */}
            <button onClick={fitWidth}
              className="flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-[10px] text-muted-foreground hover:bg-secondary transition-colors">
              <Maximize2 className="h-3 w-3" />
              <span>Vừa khung</span>
            </button>

            <button onClick={clearDocument}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              aria-label="Đóng tài liệu">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── THE KEY FIX: PDF scroll container ──
            flex-1 min-h-0 overflow-y-auto overflow-x-auto
            This CONTAINS the pdf pages inside the panel — no overflow to parent */}
        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-auto bg-muted/20"
          style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}
        >
          <Document
            file={document.blobUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
            className="flex flex-col items-center gap-3 py-4 px-4"
          >
            {numPages && Array.from({ length: numPages }, (_, i) => (
              <div key={`page_${i + 1}`} id={`pdf-page-${i + 1}`}
                className="shadow-lg rounded overflow-hidden shrink-0"
              >
                <Page
                  pageNumber={i + 1}
                  width={pageWidth}
                  loading={
                    <div className="flex items-center justify-center bg-card rounded"
                      style={{ width: pageWidth ?? 600, height: (pageWidth ?? 600) * 1.4 }}>
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  }
                  className="bg-white"
                />
              </div>
            ))}
          </Document>
        </div>

        {error && (
          <div className="mx-3 my-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 shrink-0">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // ── TEXT DOCUMENT ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border bg-secondary/30 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <FileIcon className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{document?.name}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Tài liệu {document?.type} • Xử lý cục bộ</p>
          </div>
        </div>
        <button onClick={clearDocument}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
          aria-label="Đóng tài liệu">
          <X className="h-4 w-4" />
        </button>
      </div>

      {document?.type === "doc" && error && (
        <div className="flex items-start gap-2 px-3 py-2 border-b border-border bg-chart-5/10 shrink-0">
          <AlertCircle className="h-3.5 w-3.5 text-chart-5 shrink-0 mt-0.5" />
          <p className="text-[10px] text-chart-5">{error}</p>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-4"
        style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90 bg-transparent">
          {document?.content}
        </pre>
      </div>
    </div>
  );
}
