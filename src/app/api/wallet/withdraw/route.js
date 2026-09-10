import { authenticateRequest, getUserId, unauthorizedResponse } from "@/lib/auth";
import { readJson } from "@/lib/api";
import { connectMongoose } from "@/lib/mongoose";
import AuditLog from "@/models/AuditLog";
import { consumeRateLimit } from "@/lib/solana/rate-limit";
import { isValidSolanaAddress, parsePositiveAmount } from "@/lib/solana/validation";

export async function POST(request) {
  const decoded = await authenticateRequest(request);
  if (!decoded) return unauthorizedResponse();
  const userId = getUserId(decoded);
  if (!consumeRateLimit(`withdraw:${userId}`, 3, 60 * 60 * 1000)) return Response.json({ error: "Withdrawal rate limit exceeded." }, { status: 429 });
  try {
    const body = await readJson(request);
    if (!isValidSolanaAddress(body.destination)) return Response.json({ error: "Invalid destination address." }, { status: 400 });
    const amount = parsePositiveAmount(body.amount);
    await connectMongoose();
    await AuditLog.create({ action: "withdrawal_requested", userId, metadata: { destination: body.destination, amount, token: "SOL" } });
    if (process.env.SOLANA_WITHDRAWALS_ENABLED !== "true") return Response.json({ error: "Withdrawals are disabled." }, { status: 503 });
    return Response.json({ error: "Withdrawals require server-side risk and admin approval before activation." }, { status: 501 });
  } catch (error) {
    return Response.json({ error: error.message || "Invalid withdrawal request." }, { status: 400 });
  }
}