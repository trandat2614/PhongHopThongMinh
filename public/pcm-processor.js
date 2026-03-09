/**
 * AudioWorklet processor — captures Float32 audio frames from the mic
 * and posts them to the main thread for PCM16 conversion + WebSocket streaming.
 *
 * Runs in a dedicated audio thread for minimal latency and zero GC jank.
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._bufferSize = 0;
    this._chunks = [];
    // Default: send every ~250ms at 16kHz = 4000 samples
    this._flushInterval = 4000;
    this._stopped = false;

    this.port.onmessage = (event) => {
      if (event.data.type === "configure") {
        // Allow main thread to set flush interval
        // flushSamples = sampleRate * chunkDurationMs / 1000
        if (event.data.flushSamples) {
          this._flushInterval = event.data.flushSamples;
        }
      }
      if (event.data.type === "stop") {
        this._stopped = true;
      }
    };
  }

  process(inputs) {
    if (this._stopped) return false;

    const input = inputs[0];
    if (!input || !input[0]) return true;

    // Mono channel 0
    const channelData = input[0];
    // Copy the Float32 samples (128 frames per quantum at most)
    this._chunks.push(new Float32Array(channelData));
    this._bufferSize += channelData.length;

    if (this._bufferSize >= this._flushInterval) {
      // Merge chunks into a single Float32Array
      const merged = new Float32Array(this._bufferSize);
      let offset = 0;
      for (const chunk of this._chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      // Post to main thread (transfer the buffer for zero-copy)
      this.port.postMessage(
        { type: "audio", samples: merged.buffer },
        [merged.buffer]
      );

      this._chunks = [];
      this._bufferSize = 0;
    }

    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
