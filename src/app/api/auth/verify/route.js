import { readJson } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth-session";
import { findUserByPublicKey, findUserBySessionId, readLoginChallenge, markChallengeUsed, sanitizeUser } from "@/lib/user-store";
import { verifyEcdsaSignature } from "@/lib/crypto-auth";
import { ensureUserWallet } from "@/lib/solana/wallet-service";

export async function POST(request) {
  try {
    const body = await readJson(request);
    const { challengeId, challenge, publicKey, signature, sessionId } = body;

    if (!challengeId || !challenge || !signature) {
      return Response.json({ error: "challengeId, challenge, and signature are required." }, { status: 400 });
    }

    const validChallenge = await readLoginChallenge(challengeId);
    if (!validChallenge || validChallenge.used || new Date(validChallenge.expiresAt).getTime() < Date.now()) {
      return Response.json({ error: "Challenge expired or invalid." }, { status: 401 });
    }

    const resolvedSessionUser = sessionId ? await findUserBySessionId(sessionId) : null;
    const resolvedPublicKey = String(publicKey || resolvedSessionUser?.publicKey || "").trim();
    const user = resolvedSessionUser || (resolvedPublicKey ? await findUserByPublicKey(resolvedPublicKey) : null);

    if (!resolvedPublicKey && !sessionId) {
      return Response.json({ error: "A public key or sessionId is required." }, { status: 400 });
    }

    if (!user) return Response.json({ error: "No matching crypto user found. Create an account first." }, { status: 404 });

    const expectedPublicKey = user.publicKey || resolvedPublicKey;
    if (validChallenge.publicKey && expectedPublicKey && validChallenge.publicKey !== expectedPublicKey) {
      return Response.json({ error: "Challenge mismatch detected." }, { status: 401 });
    }

    const isValid = await verifyEcdsaSignature({ publicKey: expectedPublicKey, challenge, signature });
    if (!isValid) return Response.json({ error: "Invalid signature." }, { status: 401 });

    await markChallengeUsed(challengeId);
    const safeUser = sanitizeUser(user);
    let wallet = null;
    try {
      wallet = await ensureUserWallet({ userId: safeUser.userId, username: safeUser.username, email: safeUser.email || "" });
    } catch {
      // Authentication should still succeed when wallet provisioning is temporarily unavailable.
    }
    const response = Response.json({ user: safeUser, wallet: wallet ? { walletAddress: wallet.walletAddress } : null, ok: true });
    return setSessionCookie(response, safeUser);
  } catch (error) {
    return Response.json({ error: error.message || "Verification failed." }, { status: 400 });
  }
}
