import { readJson } from "@/lib/api";
import { createLoginChallenge } from "@/lib/user-store";

export async function POST(request) {
  try {
    const body = await readJson(request);
    const publicKey = String(body.publicKey || "").trim();
    const sessionId = String(body.sessionId || "").trim();
    const username = String(body.username || "").trim();
    if (!publicKey && !username && !sessionId) return Response.json({ error: "Public key or username is required." }, { status: 400 });

    const challenge = await createLoginChallenge({
      userId: sessionId || username || null,
      publicKey: publicKey || null,
      challenge: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      expiryMs: 5 * 60 * 1000,
    });

    return Response.json({ challenge: challenge.challenge, challengeId: challenge.challengeId, expiresAt: challenge.expiresAt, ok: true });
  } catch (error) {
    return Response.json({ error: error.message || "Could not create challenge." }, { status: 400 });
  }
}
