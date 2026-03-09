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

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentViewerProps {
  onClear?: () => void;
}

type DocumentType = "txt" | "doc" | "docx" | "pdf";

interface DocumentState {
  name: string;
  content: string;
  blobUrl: string;
  type: DocumentType;
}

const ACCEPTED_EXTENSIONS = [".txt", ".doc", ".docx", ".pdf"];

export function DocumentViewer({ onClear }: DocumentViewerProps) {
  const [document, setDocument] = useState<DocumentState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // PDF state
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Measure container width for auto-fit
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        // Subtract padding (32px each side = 64px total)
        const width = containerRef.current.clientWidth - 64;
        setContainerWidth(Math.max(width, 200));
      }
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [document]);

  // Clean up blob URL
  useEffect(() => {
    return () => {
      if (document?.blobUrl) {
        URL.revokeObjectURL(document.blobUrl);
      }
    };
  }, [document?.blobUrl]);

  const processFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setNumPages(null);
    setCurrentPage(1);
    setZoom(1);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (extension === "pdf") {
        const blobUrl = URL.createObjectURL(file);
        setDocument({ name: file.name, content: "", blobUrl, type: "pdf" });
      } else if (extension === "txt") {
        const text = await file.text();
        setDocument({ name: file.name, content: text, blobUrl: "", type: "txt" });
      } else if (extension === "docx") {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setDocument({ name: file.name, content: result.value, blobUrl: "", type: "docx" });
      } else if (extension === "doc") {
        setError(
          "File .doc cũ có hỗ trợ hạn chế. Vui lòng chuyển đổi sang .docx, .pdf hoặc .txt để có kết quả tốt nhất."
        );
        const text = await file.text();
        const cleaned = text.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ");
        setDocument({ name: file.name, content: cleaned, blobUrl: "", type: "doc" });
      } else {
        setError("Loại file không được hỗ trợ. Vui lòng tải lên file .pdf, .txt, .doc, hoặc .docx.");
      }
    } catch (err) {
      setError(
        `Không thể đọc file: ${err instanceof Error ? err.message : "Lỗi không xác định"}`
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const clearDocument = useCallback(() => {
    if (document?.blobUrl) {
      URL.revokeObjectURL(document.blobUrl);
    }
    setDocument(null);
    setError(null);
    setNumPages(null);
    setCurrentPage(1);
    setZoom(1);
    onClear?.();
  }, [document?.blobUrl, onClear]);

  // PDF callbacks
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfLoading(false);
  }, []);

  const onDocumentLoadError = useCallback((err: Error) => {
    setError(`Không thể tải PDF: ${err.message}`);
    setPdfLoading(false);
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.25, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 0.25, 0.5));
  }, []);

  const fitToWidth = useCallback(() => {
    setZoom(1);
  }, []);

  // Page navigation
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, numPages ?? 1)));
  }, [numPages]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  // Empty state
  if (!document && !isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        {/* Privacy notice */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-primary/5">
          <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
          <p className="text-[10px] text-muted-foreground">
            <span className="font-medium text-foreground">Bảo mật:</span> File được xử lý cục bộ trong trình duyệt. Không có dữ liệu nào được tải lên máy chủ.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-1 flex-col items-center justify-center gap-4 p-6 m-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
            isDragOver
              ? "border-primary bg-primary/10"
              : "border-border hover:border-muted-foreground/50 hover:bg-secondary/30"
          }`}
        >
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
              isDragOver ? "bg-primary/20" : "bg-secondary border border-border"
            }`}
          >
            <Upload
              className={`h-6 w-6 ${isDragOver ? "text-primary" : "text-muted-foreground"}`}
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {isDragOver ? "Thả file tại đây" : "Tải lên tài liệu"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Kéo thả hoặc nhấp để chọn file
            </p>
            <p className="mt-2 text-[10px] text-muted-foreground/70">
              Hỗ trợ: .pdf, .txt, .doc, .docx
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(",")}
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Tải lên tài liệu"
          />
        </div>

        {error && (
          <div className="mx-4 mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Đang xử lý tài liệu...</p>
      </div>
    );
  }

  // PDF document
  if (document?.type === "pdf") {
    // Calculate page width based on container and zoom
    const pageWidth = containerWidth > 0 ? containerWidth * zoom : undefined;

    return (
      <div className="flex flex-1 flex-col">
        {/* PDF header */}
        <div className="flex flex-col gap-2 border-b border-border bg-secondary/30 px-4 py-3 shrink-0">
          {/* File info */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-5/20 shrink-0">
                <FileText className="h-4 w-4 text-chart-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {document.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  PDF • {numPages ? `${numPages} trang` : "Đang tải..."} • Xử lý cục bộ
                </p>
              </div>
            </div>
            <button
              onClick={clearDocument}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
              aria-label="Xóa tài liệu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Page nav */}
            <div className="flex items-center gap-1">
              <button
                onClick={prevPage}
                disabled={currentPage <= 1}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Trang trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-foreground tabular-nums min-w-[80px] text-center">
                {currentPage} / {numPages ?? "..."}
              </span>
              <button
                onClick={nextPage}
                disabled={currentPage >= (numPages ?? 1)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Trang sau"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Zoom */}
            <div className="flex items-center gap-1">
              <button
                onClick={zoomOut}
                disabled={zoom <= 0.5}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Thu nhỏ"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-xs text-foreground tabular-nums min-w-[48px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={zoomIn}
                disabled={zoom >= 3}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Phóng to"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={fitToWidth}
                className="flex h-7 items-center gap-1 rounded-md px-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-[10px]"
                aria-label="Vừa khung"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Vừa khung</span>
              </button>
            </div>
          </div>
        </div>

        {/* PDF Viewer */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-muted/30"
        >
          {pdfLoading && (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Đang tải PDF...</p>
              </div>
            </div>
          )}
          <Document
            file={document.blobUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
            className="flex flex-col items-center gap-4 py-4 px-4"
          >
            {numPages &&
              Array.from({ length: numPages }, (_, index) => (
                <div
                  key={`page_${index + 1}`}
                  className="shadow-lg"
                  id={`pdf-page-${index + 1}`}
                >
                  <Page
                    pageNumber={index + 1}
                    width={pageWidth}
                    loading={
                      <div 
                        className="flex items-center justify-center bg-card"
                        style={{ width: pageWidth, height: pageWidth ? pageWidth * 1.4 : 600 }}
                      >
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
          <div className="mx-4 my-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // Text document
  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-secondary/30 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <FileIcon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {document?.name}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">
              File {document?.type} • Xử lý cục bộ
            </p>
          </div>
        </div>
        <button
          onClick={clearDocument}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
          aria-label="Xóa tài liệu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Warning for .doc */}
      {document?.type === "doc" && error && (
        <div className="flex items-start gap-2 px-4 py-2 border-b border-border bg-chart-5/10">
          <AlertCircle className="h-3.5 w-3.5 text-chart-5 shrink-0 mt-0.5" />
          <p className="text-[10px] text-chart-5">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="prose prose-sm prose-invert max-w-none">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90 bg-transparent p-0 m-0">
            {document?.content}
          </pre>
        </div>
      </div>
    </div>
  );
}
