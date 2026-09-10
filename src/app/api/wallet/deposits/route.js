import { authenticateRequest, getUserId, unauthorizedResponse } from "@/lib/auth";
import { readJson } from "@/lib/api";
import { ensureUserWallet } from "@/lib/solana/wallet-service";
import { processIncomingSolSignature } from "@/lib/solana/deposits";
import { consumeRateLimit } from "@/lib/solana/rate-limit";

export async function POST(request) {
  const decoded = await authenticateRequest(request);
  if (!decoded) return unauthorizedResponse();
  const userId = getUserId(decoded);
  if (!userId) return unauthorizedResponse();
  if (!consumeRateLimit(`deposit:${userId}`, 20, 60 * 60 * 1000)) return Response.json({ error: "Deposit verification rate limit exceeded." }, { status: 429 });
  try {
    const body = await readJson(request);
    const signature = String(body.signature || "").trim();
    const commitment = body.commitment === "confirmed" ? "confirmed" : "finalized";
    if (!signature || signature.length > 128) return Response.json({ error: "A valid transaction signature is required." }, { status: 400 });
    const wallet = await ensureUserWallet({ userId, email: decoded.email || "" });
    const deposit = await processIncomingSolSignature({ userId, walletAddress: wallet.walletAddress, signature, commitment });
    if (!deposit) return Response.json({ error: commitment === "finalized" ? "Transaction is not finalized, failed, or does not transfer SOL to your wallet." : "Transaction is not confirmed, failed, or does not transfer SOL to your wallet." }, { status: 409 });
    return Response.json({ deposit: { signature: deposit.signature, amount: deposit.amount, token: deposit.token, status: deposit.status, createdAt: deposit.createdAt } });
  } catch (error) {
    return Response.json({ error: error.message || "Could not verify deposit." }, { status: 400 });
  }
}