/**
 * Audio processing pipeline for real-time STT streaming.
 *
 * Responsibilities:
 *  - Capture microphone input via AudioContext + AudioWorklet
 *  - Convert Float32 samples to 16-bit PCM (Int16) binary
 *  - Provide an AnalyserNode for waveform visualisation
 *  - Flush PCM chunks at configurable intervals
 *  - Clean shutdown of all audio resources
 *
 * Future extensibility points:
 *  - Noise suppression (insert a node before the worklet)
 *  - Gain control (GainNode between source and worklet)
 *  - Voice Activity Detection (VAD) analysis on Float32 data
 */

// ── Types ──

export interface AudioPipelineConfig {
  /** Target sample rate for the AudioContext (default: 16000) */
  sampleRate: number;
  /** How often to flush audio chunks in milliseconds (default: 250) */
  chunkIntervalMs: number;
  /** Number of audio channels (default: 1 = mono) */
  channels: number;
}

export interface AudioPipeline {
  /** The AnalyserNode for canvas-based visualisation */
  analyser: AnalyserNode;
  /** The raw MediaStream from getUserMedia */
  stream: MediaStream;
  /** The AudioContext driving the pipeline */
  context: AudioContext;
  /** Shuts down everything: stops tracks, closes context, disconnects nodes */
  destroy: () => void;
}

export const DEFAULT_PIPELINE_CONFIG: AudioPipelineConfig = {
  sampleRate: 16000,
  chunkIntervalMs: 250,
  channels: 1,
};

// ── Float32 -> Int16 PCM conversion ──

/**
 * Converts a Float32Array of audio samples (-1.0 to 1.0)
 * into a 16-bit PCM ArrayBuffer (little-endian Int16).
 *
 * This is the format expected by Whisper, Vosk, DeepSpeech,
 * and most production STT backends.
 */
export function float32ToInt16PCM(float32: Float32Array): ArrayBuffer {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    // Clamp to [-1, 1] then scale to Int16 range
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16.buffer;
}

// ── Pipeline factory ──

/**
 * Creates a complete audio capture pipeline:
 *  mic -> MediaStreamSource -> AnalyserNode -> AudioWorkletNode
 *
 * @param onChunk  Called with a 16-bit PCM ArrayBuffer each flush interval.
 *                 The caller (useSocketSTT) sends this to the WebSocket.
 * @param config   Optional pipeline configuration overrides.
 * @returns        An AudioPipeline handle for visualisation and cleanup.
 */
export async function createAudioPipeline(
  onChunk: (pcm16: ArrayBuffer) => void,
  config: Partial<AudioPipelineConfig> = {}
): Promise<AudioPipeline> {
  const cfg: AudioPipelineConfig = { ...DEFAULT_PIPELINE_CONFIG, ...config };

  // 1. Get microphone stream
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      sampleRate: cfg.sampleRate,
      channelCount: cfg.channels,
      echoCancellation: true,
      noiseSuppression: true,
    },
  });

  // 2. Create AudioContext at desired sample rate
  const context = new AudioContext({ sampleRate: cfg.sampleRate });

  // 3. Wire up source -> analyser -> worklet
  const source = context.createMediaStreamSource(stream);

  const analyser = context.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.7;
  source.connect(analyser);

  // 4. Load the AudioWorklet processor
  await context.audioWorklet.addModule("/pcm-processor.js");
  const workletNode = new AudioWorkletNode(context, "pcm-processor", {
    channelCount: cfg.channels,
    channelCountMode: "explicit",
  });

  // Configure the flush interval in the worklet
  const flushSamples = Math.floor(cfg.sampleRate * cfg.chunkIntervalMs / 1000);
  workletNode.port.postMessage({
    type: "configure",
    flushSamples,
  });

  // 5. Listen for Float32 chunks from the worklet and convert to PCM16
  workletNode.port.onmessage = (event: MessageEvent) => {
    if (event.data.type === "audio") {
      const float32 = new Float32Array(event.data.samples);
      const pcm16 = float32ToInt16PCM(float32);
      onChunk(pcm16);
    }
  };

  // Connect analyser -> worklet -> destination (destination required to keep the pipeline alive)
  analyser.connect(workletNode);
  workletNode.connect(context.destination);

  // 6. Cleanup handle
  const destroy = () => {
    try { workletNode.port.postMessage({ type: "stop" }); } catch { /* */ }
    try { workletNode.disconnect(); } catch { /* */ }
    try { analyser.disconnect(); } catch { /* */ }
    try { source.disconnect(); } catch { /* */ }
    stream.getTracks().forEach((t) => t.stop());
    context.close().catch(() => {});
  };

  return { analyser, stream, context, destroy };
}
