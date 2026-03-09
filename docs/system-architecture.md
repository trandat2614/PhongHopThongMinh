# VoxStream — System Architecture Document

## 1. Overview

VoxStream is a real-time Speech-to-Text (STT) web application built with **Next.js 16**, **React 19**, and **TypeScript**. It operates in two modes:

1. **Browser STT Mode** — Uses the native Web Speech API (`SpeechRecognition`) for zero-backend transcription. This is the default when no WebSocket server is configured.
2. **WebSocket STT Mode** — Streams 16 kHz mono PCM audio chunks to an external STT backend (e.g., Whisper, Vosk) over WebSocket and renders server-returned transcripts.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4 |
| Icons | Lucide React |
| Audio Capture | RecordRTC (dynamic import, client-only) |
| Audio Analysis | Web Audio API (`AudioContext`, `AnalyserNode`) |
| Speech Recognition | Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) |
| Streaming Transport | Native WebSocket API |
| Language | TypeScript (strict) |

---

## 3. File Structure

```
app/
  layout.tsx              # Root layout, fonts, metadata
  page.tsx                # Entry point, keyboard shortcut handler
  globals.css             # Tailwind v4 config, design tokens, keyframes
  api/stt/route.ts        # (Optional) echo WebSocket endpoint for testing

components/stt/
  stt-controller.tsx      # Main orchestrator — composes all sub-components
  status-indicator.tsx     # Connection state badge (Offline/Connecting/Live/Error) + timer
  audio-visualizer.tsx     # Real-time 32-bar frequency visualizer (Canvas + AnalyserNode)
  record-button.tsx        # Mic toggle with pulse animation rings
  transcript-panel.tsx     # Auto-scrolling list of transcript entries (partial/final)
  error-banner.tsx         # Dismissable error alert

hooks/
  use-stt-recorder.ts     # Core hook — audio capture, STT engine, state management

lib/
  stt-types.ts            # All TypeScript interfaces, configs, language list

docs/
  huong-dan-su-dung.md    # User guide (Vietnamese)
  system-architecture.md  # This document
```

---

## 4. Component Architecture

```
Page
 └─ STTController
     ├─ StatusIndicator          (status, duration)
     ├─ ErrorBanner              (error message, dismiss handler)
     ├─ AudioVisualizer          (isActive, analyserNode)
     ├─ RecordButton             (isRecording, isConnecting, onToggle)
     ├─ Language Selector        (<select> bound to setLanguage)
     ├─ Audio Config Badges      (static display: 16kHz, Mono, etc.)
     └─ TranscriptPanel          (entries[], isRecording)
```

**Data flow:** All state lives in the `useSTTRecorder` hook. `STTController` is the only consumer of the hook and passes slices of state down to each presentational child component via props.

---

## 5. Core Hook: `useSTTRecorder`

### State

| State | Type | Purpose |
|-------|------|---------|
| `isRecording` | `boolean` | Whether audio capture is active |
| `status` | `ConnectionStatus` | `"idle" \| "connecting" \| "live" \| "error"` |
| `transcripts` | `TranscriptEntry[]` | Ordered list of transcript segments |
| `error` | `string \| null` | Current error message |
| `duration` | `number` | Recording duration in seconds |
| `analyserNode` | `AnalyserNode \| null` | Passed to AudioVisualizer for frequency data |
| `browserSTTMode` | `boolean` | Whether running in browser STT mode |
| `language` | `string` | BCP-47 language code (default: `"vi-VN"`) |

### Mode Selection Logic

```
shouldUseBrowserSTT(wsUrl) → boolean
  ├─ env NEXT_PUBLIC_STT_DEMO_MODE === "true"  → true
  ├─ default URL + NOT localhost                → true  (deployed with no backend)
  └─ otherwise                                  → false (use WebSocket)
```

### Browser STT Flow

```
startBrowserSTT()
  1. getUserMedia() → MediaStream
  2. Create AudioContext + AnalyserNode (for visualizer)
  3. Instantiate SpeechRecognition
     - lang = language state (default "vi-VN")
     - continuous = true
     - interimResults = true
  4. Bind events:
     - onstart  → setStatus("live"), start timer
     - onresult → parse SpeechRecognitionEvent, update transcripts[]
     - onerror  → setError() for fatal errors, ignore "no-speech"/"aborted"
     - onend    → auto-restart if still recording (browser stops on silence)
  5. recognition.start()
```

### WebSocket STT Flow

```
startRealRecording()
  1. getUserMedia() → MediaStream
  2. Create AudioContext + AnalyserNode
  3. Open WebSocket(wsUrl) with binaryType = "arraybuffer"
  4. On ws.open:
     - setStatus("live"), start duration timer
  5. Dynamic import RecordRTC
     - Config: StereoAudioRecorder, timeSlice: 1000ms, 16kHz, mono, WAV
     - ondataavailable → blob.arrayBuffer() → ws.send(buffer)
  6. On ws.message:
     - Try JSON parse as ServerMessage { type, text, id, isFinal }
     - Partial transcripts replace the last non-final entry
     - Final transcripts append
     - Plain text fallback if JSON parse fails
  7. On ws.close:
     - Map code → human-readable error (1006 = "Connection lost...")
     - Cleanup all resources
```

### Resource Cleanup

The `cleanup()` function is called on:
- User clicks Stop
- WebSocket closes unexpectedly
- Component unmounts (`useEffect` cleanup)

It handles:
1. Clear duration timer (`clearInterval`)
2. Abort SpeechRecognition (nullify all event handlers first to prevent re-trigger)
3. Stop RecordRTC → destroy
4. Close WebSocket (code 1000)
5. Stop all MediaStream tracks
6. Close AudioContext
7. Reset `analyserNode` and `duration` state

---

## 6. Audio Pipeline (WebSocket Mode)

```
Microphone
  → getUserMedia({ sampleRate: 44100, mono, echoCancellation, noiseSuppression })
  → MediaStream
      ├─ AudioContext (44100 Hz)
      │   → MediaStreamSource
      │       → AnalyserNode (fftSize: 256, smoothing: 0.7)
      │           → AudioVisualizer (Canvas, 32 bars, 60fps RAF loop)
      │
      └─ RecordRTC (StereoAudioRecorder)
          Config:
            mimeType:             audio/wav
            timeSlice:            1000 ms
            desiredSampRate:      16000 Hz
            numberOfAudioChannels: 1
          → ondataavailable(blob) every 1s
              → blob.arrayBuffer()
                  → WebSocket.send(ArrayBuffer)
                      → STT Backend
```

---

## 7. Audio Visualizer

- Uses `<canvas>` element with `requestAnimationFrame` loop at ~60fps
- Reads frequency data via `analyserNode.getByteFrequencyData()`
- Renders 32 bars centered vertically with height proportional to amplitude
- Color: `oklch(0.65 0.2 145)` (primary green) with opacity = 0.3 + value * 0.7
- Idle state: flat 4px bars in muted color
- `ResizeObserver` handles responsive canvas sizing with DPR scaling

---

## 8. WebSocket Protocol

### Client → Server
- Binary `ArrayBuffer` chunks every 1000ms
- Each chunk: ~32KB of 16kHz 16-bit mono PCM in WAV container

### Server → Client (expected `ServerMessage` format)

```typescript
interface ServerMessage {
  type: "transcript" | "partial" | "error" | "info";
  text?: string;        // The transcribed text
  id?: string;          // Unique segment ID
  isFinal?: boolean;    // true = finalized, false = interim
  message?: string;     // Error description (when type = "error")
}
```

Plain text responses are also accepted as a fallback (treated as final transcripts).

### Close Code Handling

| Code | Mapped Message |
|------|---------------|
| 1000 | Normal close (no error) |
| 1001 | Server is going away |
| 1002 | Protocol error |
| 1003 | Unsupported data type |
| 1006 | Connection lost. Server may be unreachable or not running |
| 1011 | Unexpected server error |
| 1015 | TLS handshake failed |

---

## 9. Language Support

Languages are defined in `lib/stt-types.ts` as `SUPPORTED_LANGUAGES`:

| Code | Language |
|------|----------|
| `vi-VN` | Tieng Viet (default) |
| `en-US` | English (US) |
| `en-GB` | English (UK) |
| `ja-JP` | Japanese |
| `ko-KR` | Korean |
| `zh-CN` | Chinese (Simplified) |
| `fr-FR` | French |
| `de-DE` | German |
| `es-ES` | Spanish |
| `th-TH` | Thai |

Language must be selected **before** starting a recording session. In browser STT mode, the `recognition.lang` property is set from this value. In WebSocket mode, language negotiation depends on the backend protocol.

---

## 10. Design System

### Color Palette (5 colors)

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `oklch(0.13 0.005 260)` | Page background (dark navy) |
| `--foreground` | `oklch(0.93 0.005 260)` | Primary text (off-white) |
| `--primary` | `oklch(0.65 0.2 145)` | Accent green (live states, buttons) |
| `--secondary` | `oklch(0.22 0.01 260)` | Card surfaces, badges |
| `--destructive` | `oklch(0.55 0.22 27)` | Error states |

### Custom Tokens

| Token | Usage |
|-------|-------|
| `--live` | Alias for primary, used in live indicator |
| `--live-glow` | 30% opacity primary, used for button shadow glow |
| `--surface-elevated` | Slightly lighter surface for hover states |

### Animations

| Keyframe | Duration | Usage |
|----------|----------|-------|
| `pulse-ring` | 2s infinite | Expanding rings on record button, live dot |
| `waveform-bar` | Variable | Reserved for CSS-based waveform fallback |

---

## 11. Accessibility

- All interactive elements have `aria-label` attributes
- Error banner uses `role="alert"` for screen reader announcements
- Canvas visualizer is `aria-hidden="true"` (decorative)
- Focus-visible ring styles on the record button
- Keyboard shortcut (Space) skips input/textarea/select elements
- Status indicator communicates state via text labels, not color alone

---

## 12. Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `NEXT_PUBLIC_STT_WS_URL` | No | `ws://localhost:8080/ws/stt` | WebSocket endpoint for STT backend |
| `NEXT_PUBLIC_STT_DEMO_MODE` | No | `undefined` | Force browser STT mode when set to `"true"` |

---

## 13. Browser Compatibility

| Feature | Chrome | Edge | Safari | Firefox |
|---------|--------|------|--------|---------|
| Web Speech API | 33+ | 79+ | 14.1+ | Not supported |
| getUserMedia | 53+ | 12+ | 11+ | 36+ |
| AudioContext | 35+ | 12+ | 14.1+ | 25+ |
| WebSocket | 16+ | 12+ | 7+ | 11+ |
| RecordRTC | All modern | All modern | All modern | All modern |

Note: Firefox does not support the Web Speech API. Users on Firefox will need a WebSocket STT backend for transcription (the audio visualizer will still work).
