"use client";

import { useState, useCallback, useMemo } from "react";
import {
  ClipboardList,
  CheckSquare,
  Square,
  Download,
  FileText,
  Users,
  Clock,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  AlertCircle,
  Target,
  RefreshCw,
} from "lucide-react";
import type { TranscriptEntry, RoomInfo } from "@/lib/stt-types";

interface ActionItem {
  id: string;
  text: string;
  done: boolean;
  assignee?: string;
  priority: "high" | "medium" | "low";
}

interface MeetingMinute {
  time: string;
  speaker: string;
  summary: string;
}

interface PostMeetingSummaryProps {
  transcripts: TranscriptEntry[];
  roomInfo: RoomInfo;
  duration: number;
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function extractActionItems(transcripts: TranscriptEntry[]): ActionItem[] {
  const finalTexts = transcripts.filter((t) => t.isFinal);
  const actionKeywords = [
    "sẽ làm", "sẽ thực hiện", "cần làm", "phải làm", "todo", "action item",
    "follow up", "theo dõi", "kiểm tra lại", "chuẩn bị", "gửi", "liên hệ",
    "xem xét", "đánh giá", "cập nhật", "báo cáo", "hoàn thành", "triển khai",
  ];

  const items: ActionItem[] = [];
  let idxCounter = 0;

  for (const entry of finalTexts) {
    const lowerText = entry.text.toLowerCase();
    const hasKeyword = actionKeywords.some((kw) => lowerText.includes(kw));
    if (hasKeyword && entry.text.length > 10) {
      const priorityWords = ["khẩn cấp", "urgent", "ngay", "immediately", "ưu tiên", "priority"];
      const isHigh = priorityWords.some((pw) => lowerText.includes(pw));
      const isLow =
        lowerText.includes("có thể") || lowerText.includes("optional") || lowerText.includes("nếu có thể");

      items.push({
        id: `action-${idxCounter++}`,
        text:
          entry.text.length > 100
            ? entry.text.substring(0, 100) + "..."
            : entry.text,
        done: false,
        assignee: entry.userName ?? entry.userId,
        priority: isHigh ? "high" : isLow ? "low" : "medium",
      });
    }
  }

  // If no action items were extracted, show placeholder examples
  if (items.length === 0 && finalTexts.length > 0) {
    const speakers = [...new Set(finalTexts.map((t) => t.userName ?? t.userId ?? "Không rõ"))];
    items.push({
      id: "action-placeholder-1",
      text: "Xem lại biên bản cuộc họp và xác nhận các điểm đã thảo luận",
      done: false,
      assignee: speakers[0],
      priority: "high",
    });
    if (speakers.length > 1) {
      items.push({
        id: "action-placeholder-2",
        text: "Chia sẻ tài liệu tóm tắt với các thành viên vắng mặt",
        done: false,
        assignee: speakers[1],
        priority: "medium",
      });
    }
    items.push({
      id: "action-placeholder-3",
      text: "Lên lịch họp tiếp theo để theo dõi tiến độ",
      done: false,
      priority: "low",
    });
  }

  return items;
}

function buildMeetingMinutes(transcripts: TranscriptEntry[]): MeetingMinute[] {
  const final = transcripts.filter((t) => t.isFinal && t.text.length > 5);
  // Group by speaker in chunks
  const minutes: MeetingMinute[] = [];
  let i = 0;
  while (i < final.length) {
    const entry = final[i];
    const speaker = entry.userName ?? entry.userId ?? "Người nói";
    // Accumulate consecutive same-speaker entries
    let text = entry.text;
    let j = i + 1;
    while (j < final.length && (final[j].userName ?? final[j].userId) === (entry.userName ?? entry.userId) && j - i < 4) {
      text += " " + final[j].text;
      j++;
    }
    minutes.push({
      time: new Date(entry.timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      speaker,
      summary: text.length > 180 ? text.substring(0, 180) + "..." : text,
    });
    i = j;
  }
  return minutes;
}

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function SectionCard({ title, icon, children, defaultOpen = true }: SectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

const PRIORITY_CONFIG = {
  high: { label: "Cao", className: "bg-destructive/20 text-destructive border-destructive/30" },
  medium: { label: "TB", className: "bg-chart-4/20 text-chart-4 border-chart-4/30" },
  low: { label: "Thấp", className: "bg-chart-2/20 text-chart-2 border-chart-2/30" },
};

export function PostMeetingSummary({
  transcripts,
  roomInfo,
  duration,
  onClose,
}: PostMeetingSummaryProps) {
  const [actionItems, setActionItems] = useState<ActionItem[]>(() =>
    extractActionItems(transcripts)
  );
  const [isRegenerating, setIsRegenerating] = useState(false);

  const minutes = useMemo(() => buildMeetingMinutes(transcripts), [transcripts]);
  const finalTranscripts = useMemo(() => transcripts.filter((t) => t.isFinal), [transcripts]);
  const speakers = useMemo(
    () => [...new Set(finalTranscripts.map((t) => t.userName ?? t.userId ?? "Không rõ"))],
    [finalTranscripts]
  );

  const toggleItem = useCallback((id: string) => {
    setActionItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  }, []);

  const regenerate = useCallback(() => {
    setIsRegenerating(true);
    setTimeout(() => {
      setActionItems(extractActionItems(transcripts));
      setIsRegenerating(false);
    }, 1000);
  }, [transcripts]);

  /** Safe clipboard helper */
  const copyToClipboard = useCallback((text: string) => {
    if (typeof window !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      });
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }, []);

  const buildExportText = useCallback(() => {
    const header = [
      "╔══════════════════════════════════════════════════╗",
      "║           BIÊN BẢN CUỘC HỌP - VOXSTREAM          ║",
      "╚══════════════════════════════════════════════════╝",
      "",
      `Phòng:        ${roomInfo.roomId}`,
      `Ngày:         ${new Date(roomInfo.createdAt).toLocaleDateString("vi-VN")}`,
      `Thời lượng:   ${formatDuration(duration)}`,
      `Người tham dự: ${speakers.join(", ")}`,
      `Tổng lượt:    ${finalTranscripts.length} câu`,
      "",
      "─".repeat(52),
      "NỘI DUNG CUỘC HỌP",
      "─".repeat(52),
      "",
    ];

    const minuteLines = minutes.map(
      (m) => `[${m.time}] ${m.speaker}:\n  ${m.summary}`
    );

    const actionLines = [
      "",
      "─".repeat(52),
      "DANH SÁCH VIỆC CẦN LÀM",
      "─".repeat(52),
      "",
      ...actionItems.map(
        (item, i) =>
          `${i + 1}. [${item.done ? "✓" : " "}] ${item.text}${item.assignee ? ` (@${item.assignee})` : ""} [${PRIORITY_CONFIG[item.priority].label}]`
      ),
    ];

    return [...header, ...minuteLines, ...actionLines].join("\n");
  }, [roomInfo, duration, speakers, finalTranscripts, minutes, actionItems]);

  const exportTxt = useCallback(() => {
    const content = buildExportText();
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bien-ban-${roomInfo.roomId}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [buildExportText, roomInfo]);

  const completedCount = actionItems.filter((i) => i.done).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Tổng kết cuộc họp</h2>
              <p className="text-xs text-muted-foreground">
                Phòng {roomInfo.roomId} • {formatDuration(duration)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <Clock className="h-4 w-4 text-chart-2" />, label: "Thời lượng", value: formatDuration(duration) },
              { icon: <Users className="h-4 w-4 text-chart-4" />, label: "Người nói", value: `${speakers.length}` },
              { icon: <Calendar className="h-4 w-4 text-primary" />, label: "Ngày họp", value: new Date(roomInfo.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3">
                {stat.icon}
                <span className="text-base font-bold text-foreground">{stat.value}</span>
                <span className="text-[10px] text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Meeting minutes */}
          <SectionCard
            title="Biên bản cuộc họp"
            icon={<FileText className="h-4 w-4 text-chart-2" />}
          >
            {minutes.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/20 p-3">
                <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Chưa có nội dung phiên âm. Hãy ghi âm cuộc họp trước.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {minutes.map((m, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <span className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                        {m.time}
                      </span>
                      {idx < minutes.length - 1 && (
                        <div className="mt-1 w-px flex-1 bg-border min-h-[16px]" />
                      )}
                    </div>
                    <div className="min-w-0 pb-3">
                      <span className="text-xs font-semibold text-primary">{m.speaker}</span>
                      <p className="mt-0.5 text-xs text-foreground/80 leading-relaxed">
                        {m.summary}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Action items */}
          <SectionCard
            title={`Việc cần làm (${completedCount}/${actionItems.length})`}
            icon={<Target className="h-4 w-4 text-chart-4" />}
          >
            {/* Progress bar */}
            {actionItems.length > 0 && (
              <div className="mb-3">
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{
                      width: `${actionItems.length > 0 ? (completedCount / actionItems.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground text-right">
                  {completedCount}/{actionItems.length} hoàn thành
                </p>
              </div>
            )}

            <div className="space-y-2">
              {actionItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-all hover:bg-secondary/30 ${
                    item.done ? "opacity-60 bg-secondary/10" : "bg-card"
                  } border-border`}
                >
                  <div className="mt-0.5 shrink-0">
                    {item.done ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs text-foreground leading-snug ${
                        item.done ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {item.text}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {item.assignee && (
                        <span className="text-[9px] font-mono text-muted-foreground">
                          @{item.assignee}
                        </span>
                      )}
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${
                          PRIORITY_CONFIG[item.priority].className
                        }`}
                      >
                        {PRIORITY_CONFIG[item.priority].label}
                      </span>
                    </div>
                  </div>
                  {item.done && <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />}
                </button>
              ))}
            </div>

            <button
              onClick={regenerate}
              disabled={isRegenerating}
              className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isRegenerating ? "animate-spin" : ""}`} />
              {isRegenerating ? "Đang tạo lại..." : "Tạo lại từ phiên âm"}
            </button>
          </SectionCard>

          {/* AI summary note */}
          <div className="flex items-start gap-2.5 rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">
            <Sparkles className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-foreground">Lưu ý về AI</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground leading-relaxed">
                Biên bản và danh sách việc cần làm được tạo tự động từ phiên âm. Vui lòng xem xét và chỉnh sửa trước khi chia sẻ chính thức.
              </p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border bg-card/50 shrink-0">
          <button
            onClick={() => copyToClipboard(buildExportText())}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Sao chép
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={exportTxt}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Xuất TXT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
