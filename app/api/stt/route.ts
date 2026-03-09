/**
 * Mock STT WebSocket endpoint.
 *
 * In production, replace this with a real Whisper / Deepgram / AssemblyAI
 * backend. This route accepts binary audio blobs over a WebSocket and
 * responds with simulated transcript messages so the UI works end-to-end
 * during development.
 *
 * Next.js App Router does not natively support WebSocket upgrades, so this
 * is an HTTP endpoint. The client will detect the failure and fall back to
 * the built-in demo mode.
 */
export async function GET() {
  return new Response(
    JSON.stringify({
      status: "ok",
      message:
        "STT API is running. WebSocket connections should target a standalone WS server or use the built-in demo mode.",
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}
