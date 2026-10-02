/**
 * WS /voice/session: Gemini Live streaming transcription. Next.js route handlers cannot hold a
 * WebSocket, so in production this runs as its own Cloud Run service (see docs/adr/0003-live-mode.md):
 * it mints an ephemeral Gemini Live token per officer and proxies audio with session resumption,
 * falling back to Chirp 3 STT. The DEMO app streams scripted transcripts instead.
 */
export function GET() {
  return Response.json(
    { error: 'upgrade required', detail: 'Gemini Live proxy runs as a separate Cloud Run WebSocket service; not part of the DEMO build.' },
    { status: 426 },
  );
}
