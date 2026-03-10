"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot,
  Send,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  Loader2,
  User,
  MessageCircle,
  ChevronDown,
} from "lucide-react";
import type { TranscriptEntry } from "@/lib/stt-types";

export interface AIChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  isStreaming?: boolean;
}

interface AIChatboxProps {
  transcripts: TranscriptEntry[];
  documentName?: string;
  onClose?: () => void;
  onSendQuery?: (query: string) => Promise<string>;
}

// Suggestion shortcuts
const QUICK_PROMPTS = [
  "Tóm tắt nội dung cuộc họp",
  "Quyết định nào đã được đưa ra?",
  "Tóm tắt tài liệu đã tải lên",
  "Những điểm hành động quan trọng?",
];

/** Simulated AI response based on context */
async function simulateAIResponse(
  query: string,
  transcripts: TranscriptEntry[],
  documentName?: string
): Promise<string> {
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 800));

  const lq = query.toLowerCase();
  const finalTexts = transcripts.filter((t) => t.isFinal).map((t) => t.text);
  const hasTranscript = finalTexts.length > 0;
  const snippets = finalTexts.slice(-3).join(" | ");

  if (lq.includes("tóm tắt") && lq.includes("tài liệu") && documentName) {
    return `📄 **Tóm tắt tài liệu "${documentName}"**\n\nDựa trên phân tích cấu trúc tài liệu, các nội dung chính bao gồm:\n• Các điều khoản và thỏa thuận chính\n• Quy trình và thủ tục liên quan\n• Phụ lục và tài liệu bổ sung\n\n_Để có tóm tắt chi tiết hơn, hệ thống cần kết nối với backend LLM._`;
  }

  if (lq.includes("tóm tắt") && hasTranscript) {
    return `📝 **Tóm tắt cuộc họp**\n\nDựa trên phiên âm hiện tại:\n${finalTexts.slice(0, 5).map((t, i) => `${i + 1}. ${t.substring(0, 80)}${t.length > 80 ? "..." : ""}`).join("\n")}\n\n_Đây là tóm tắt tự động. Kết nối backend LLM sẽ cung cấp phân tích sâu hơn._`;
  }

  if (lq.includes("quyết định")) {
    if (!hasTranscript)
      return "⚠️ Chưa có dữ liệu phiên âm. Hãy bắt đầu ghi âm cuộc họp trước.";
    return `🎯 **Các quyết định được đề cập**\n\nTôi phát hiện các từ khóa liên quan đến quyết định trong:\n"${snippets.substring(0, 150)}..."\n\n_Kết nối với backend AI để phân tích chính xác hơn._`;
  }

  if (lq.includes("hành động") || lq.includes("action")) {
    if (!hasTranscript)
      return "⚠️ Chưa có dữ liệu phiên âm. Hãy bắt đầu ghi âm cuộc họp trước.";
    return `✅ **Điểm hành động**\n\n• Xem lại nội dung phiên âm để xác nhận các cam kết\n• Theo dõi các mục đã thảo luận\n• Lên kế hoạch họp tiếp theo\n\nPhiên âm gần nhất: "${finalTexts[finalTexts.length - 1]?.substring(0, 100) ?? "..."}"\n\n_Tính năng trích xuất hành động tự động sẽ có khi tích hợp backend._`;
  }

  if (lq.includes("ngân sách") || lq.includes("budget")) {
    return `💰 **Phân tích ngân sách**\n\nKhông tìm thấy thông tin cụ thể về ngân sách trong phiên âm hiện tại. ${documentName ? `Kiểm tra tài liệu "${documentName}" để biết thêm chi tiết.` : "Hãy tải lên tài liệu ngân sách để phân tích."}\n\n_Kết nối backend LLM để tra cứu dữ liệu tài liệu._`;
  }

  // Generic fallback
  if (hasTranscript) {
    return `🤖 **Phản hồi của Than AI**\n\nTôi đã nhận được câu hỏi: "${query}"\n\nDựa trên ${finalTexts.length} câu phiên âm trong cuộc họp, tôi tìm thấy nội dung liên quan:\n"${snippets.substring(0, 200)}"\n\n_Để có câu trả lời chính xác, cần kết nối với backend LLM (Gemini/GPT)._`;
  }

  return `🤖 **Than AI**\n\nTôi nhận được câu hỏi của bạn: "${query}"\n\nHiện tại chưa có dữ liệu phiên âm hoặc tài liệu để phân tích. Hãy:\n1. Bắt đầu ghi âm cuộc họp\n2. Tải lên tài liệu tham khảo\n\n_Sau đó tôi có thể trả lời các câu hỏi về nội dung cuộc họp._`;
}

export function AIChatbox({
  transcripts,
  documentName,
  onClose,
  onSendQuery,
}: AIChatboxProps) {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: `Xin chào! Tôi là **Than AI** 🌟\n\nTôi có thể giúp bạn:\n• Tóm tắt nội dung cuộc họp\n• Trả lời câu hỏi về tài liệu\n• Trích xuất quyết định & hành động\n\nHãy đặt câu hỏi hoặc chọn gợi ý bên dưới!`,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setShowScrollButton(!atBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: AIChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        text: trimmed,
        timestamp: Date.now(),
      };

      const placeholderId = `a-${Date.now()}`;
      const placeholder: AIChatMessage = {
        id: placeholderId,
        role: "assistant",
        text: "",
        timestamp: Date.now(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, placeholder]);
      setInput("");
      setIsLoading(true);

      try {
        let response: string;
        if (onSendQuery) {
          response = await onSendQuery(trimmed);
        } else {
          response = await simulateAIResponse(trimmed, transcripts, documentName);
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId
              ? { ...m, text: response, isStreaming: false }
              : m
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId
              ? { ...m, text: "❌ Lỗi kết nối. Vui lòng thử lại.", isStreaming: false }
              : m
          )
        );
      } finally {
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [isLoading, transcripts, documentName, onSendQuery]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input);
      }
    },
    [input, sendMessage]
  );

  /** Render markdown-like bold text */
  function renderText(text: string) {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <strong key={i} className="font-semibold text-emerald-400">
          {part}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  }

  return (
    <div
      className={`flex flex-col rounded-2xl border border-border bg-card shadow-2xl shadow-black/40 overflow-hidden transition-all duration-300 ${
        isMinimized ? "h-14" : "h-full"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-950/60 to-card border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-900/40">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-400 border border-card">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping absolute" />
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-foreground tracking-tight">Than AI Chat</p>
            <p className="text-[10px] text-emerald-400/80">Trợ lý cuộc họp thông minh</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized((v) => !v)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label={isMinimized ? "Mở rộng" : "Thu nhỏ"}
          >
            {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              aria-label="Đóng chatbox"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Message list */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div className="shrink-0 mt-0.5">
                  {msg.role === "assistant" ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700">
                      <Sparkles className="h-3 w-3 text-white" />
                    </div>
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/20 border border-primary/30">
                      <User className="h-3 w-3 text-primary" />
                    </div>
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[84%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-secondary/50 border border-border text-foreground/90 rounded-tl-sm"
                  }`}
                >
                  {msg.isStreaming ? (
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                      <span className="text-[10px] text-emerald-400 animate-pulse">
                        Than AI đang suy nghĩ...
                      </span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-line">
                      {msg.text.split("\n").map((line, i) => (
                        <p key={i} className={i > 0 ? "mt-0.5" : ""}>
                          {renderText(line)}
                        </p>
                      ))}
                    </div>
                  )}
                  <p
                    className={`mt-1 text-[9px] font-mono tabular-nums ${
                      msg.role === "user" ? "text-primary-foreground/60 text-right" : "text-muted-foreground"
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <div className="absolute bottom-20 right-4">
              <button
                onClick={scrollToBottom}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-500 transition-colors"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Quick prompts */}
          {messages.length <= 2 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border bg-card/80 px-3 py-2.5 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi Than AI về cuộc họp..."
                rows={1}
                disabled={isLoading}
                className="flex-1 resize-none rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all disabled:opacity-50 max-h-24"
                style={{ minHeight: "36px" }}
                aria-label="Nhập câu hỏi cho AI"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                aria-label="Gửi câu hỏi"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-900/30 hover:from-emerald-400 hover:to-emerald-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-[9px] text-muted-foreground text-center">
              Enter để gửi • Shift+Enter xuống dòng
            </p>
          </div>
        </>
      )}
    </div>
  );
}
