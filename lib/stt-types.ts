// ── Connection & Status ──

/** Unified connection status across both modes */
export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "live"
  | "error";

// ── Transcript Model ──

/** A single transcript entry — shared between browser and server modes */
export interface TranscriptEntry {
  id: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
  language?: string;
  /** User or speaker identifier for meeting mode */
  userId?: string;
  /** Display name for the speaker */
  userName?: string;
}

// ── STT Mode ──

/** The two operating modes */
export type STTMode = "browser" | "server";



// ── Audio Configuration ──

/** Legacy RecordRTC config (kept for backward compatibility) */
export interface AudioConfig {
  sampleRate: number;
  numberOfAudioChannels: number;
  desiredSampRate: number;
  timeSlice: number;
  recorderType: "StereoAudioRecorder";
  mimeType: "audio/wav";
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 44100,
  numberOfAudioChannels: 1,
  desiredSampRate: 16000,
  timeSlice: 1000,
  recorderType: "StereoAudioRecorder",
  mimeType: "audio/wav",
};

/** Default WebSocket URL — override via env or props */
export const DEFAULT_WS_URL =
  process.env.NEXT_PUBLIC_STT_WS_URL ?? "ws://localhost:8080/ws/stt";

// ── STT Configuration (used by the config panel) ──

export interface STTConfig {
  mode: STTMode;
  wsUrl: string;
  language: string;
  /** Chunk interval in ms for server mode (250–500) */
  chunkIntervalMs: number;
  /** Room ID for collaborative sessions */
  roomId?: string;
  /** Room password */
  roomPassword?: string;
}

export const DEFAULT_STT_CONFIG: STTConfig = {
  mode: "browser",
  wsUrl: DEFAULT_WS_URL,
  language: "vi-VN",
  chunkIntervalMs: 250,
};

// ── Server Message Protocol ──

/** Message shape expected from the WebSocket server */
export interface ServerMessage {
  type: "transcript" | "partial" | "error" | "info";
  text?: string;
  id?: string;
  isFinal?: boolean;
  message?: string;
}

// ── Languages ──

export interface SpeechLanguage {
  code: string;
  label: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: SpeechLanguage[] = [
  { code: "vi-VN", label: "Tiếng Việt", flag: "VN" },
  { code: "en-US", label: "English (US)", flag: "US" },
  { code: "en-GB", label: "English (UK)", flag: "GB" },
  { code: "ja-JP", label: "日本語", flag: "JP" },
  { code: "ko-KR", label: "한국어", flag: "KR" },
  { code: "zh-CN", label: "中文 (简体)", flag: "CN" },
  { code: "fr-FR", label: "Français", flag: "FR" },
  { code: "de-DE", label: "Deutsch", flag: "DE" },
  { code: "es-ES", label: "Español", flag: "ES" },
  { code: "th-TH", label: "ไทย", flag: "TH" },
];

// ── Room System ──

export interface RoomInfo {
  roomId: string;
  password: string;
  createdAt: number;
  /** Display name for the local user */
  userName: string;
}

// ── Component Props ──

export interface StatusIndicatorProps {
  status: ConnectionStatus;
  duration: number;
}

export interface TranscriptPanelProps {
  entries: TranscriptEntry[];
  isRecording: boolean;
}

export interface RecordButtonProps {
  isRecording: boolean;
  isConnecting: boolean;
  onToggle: () => void;
}

export interface AudioVisualizerProps {
  isActive: boolean;
  analyserNode: AnalyserNode | null;
}
