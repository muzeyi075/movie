import { errorResponse, readJson } from "@/lib/api";
import { authenticateRequest, getUserId, unauthorizedResponse } from "@/lib/auth";
import { getHistory } from "@/lib/history-store";
import { getPremiumConfig, normalizeTokenHash, findIssuedTokenByHash, markTokenUsed, saveIssuedToken, getIssuedTokenByTransactionId } from "@/lib/premium-store";
import { generatePremiumToken, getPremiumAccessState, hashToken, isWatchedToday } from "@/lib/premium";
import { createSubscription } from "@/lib/user-store";

export async function GET() {
  return Response.json({ config: await getPremiumConfig() });
}

export async function POST(request) {
  try {
    const input = await readJson(request);
    const config = await getPremiumConfig();

    if (input.action === "verify") {
      const decoded = await authenticateRequest(request);
      if (!decoded) return unauthorizedResponse();
      const uid = getUserId(decoded);
      if (!uid) return unauthorizedResponse();
      const token = String(input.token || "").trim();
      if (!token) return Response.json({ error: "Token is required." }, { status: 400 });
      const tokenHash = normalizeTokenHash(token);
      const record = await findIssuedTokenByHash(tokenHash);
      if (!record) return Response.json({ error: "Invalid premium token." }, { status: 401 });
      if (new Date(record.expiresAt).getTime() < Date.now()) return Response.json({ error: "Premium token has expired." }, { status: 401 });
      if (record.used) return Response.json({ error: "Premium token has already been used." }, { status: 401 });
      if (record.userId && record.userId !== uid) return Response.json({ error: "This access token belongs to another account." }, { status: 403 });
      await markTokenUsed(tokenHash);
      await createSubscription(uid, record.plan || "1-month", "access-token");
      return Response.json({ success: true, message: "Premium access unlocked." });
    }

    const decoded = await authenticateRequest(request);
    if (!decoded) return unauthorizedResponse();
    const uid = getUserId(decoded);
    if (!uid) return unauthorizedResponse();

    const actualWatchCount = (await getHistory(uid)).filter((entry) => Number(entry.progress || 0) > 0 && isWatchedToday(entry.watchedAt)).length;
    const requestedWatchCount = Number(input.watchCount ?? actualWatchCount ?? 0);
    const accessState = getPremiumAccessState({ actualWatchCount, requestedWatchCount, config });

    if (!accessState.meetsThreshold) {
      return Response.json({ error: `User must watch at least ${config.requiresWatchedMovies} movie(s) before premium access can be requested.` }, { status: 403 });
    }

    const amount = Number(input.amount || config.amount);
    const transactionId = String(input.transactionId || input.txId || "").trim();
    const phoneNumber = String(input.phoneNumber || config.phoneNumber).trim();

    if (!transactionId) return Response.json({ error: "Payment transaction ID is required." }, { status: 400 });
    if (amount !== Number(config.amount)) return Response.json({ error: `Expected payment of ${config.amount}.` }, { status: 400 });

    const existing = await getIssuedTokenByTransactionId(transactionId);
    if (existing) return Response.json({ error: "This transaction has already been used for premium access." }, { status: 409 });

    const token = generatePremiumToken();
    const expiresAt = new Date(Date.now() + Number(config.tokenExpiryMinutes || 15) * 60_000).toISOString();
    const tokenHash = hashToken(token);
    await saveIssuedToken({ phoneNumber, amount, transactionId, tokenHash, expiresAt, used: false });

    return Response.json({
      success: true,
      phoneNumber,
      amount,
      transactionId,
      token,
      expiresAt,
      message: "Payment accepted. Share the token with the user by SMS or WhatsApp.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
