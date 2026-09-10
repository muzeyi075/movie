import { authenticateRequest, getUserId, unauthorizedResponse } from "@/lib/auth";
import { ensureUserWallet } from "@/lib/solana/wallet-service";

export async function GET(request) {
  const decoded = await authenticateRequest(request);
  if (!decoded) return unauthorizedResponse();
  try {
    const userId = getUserId(decoded);
    if (!userId) return unauthorizedResponse();
    const wallet = await ensureUserWallet({ userId, email: decoded.email || "" });
    return Response.json({ walletAddress: wallet.walletAddress, walletIndex: wallet.walletIndex });
  } catch (error) {
    return Response.json({ error: error.message || "Wallet unavailable." }, { status: 503 });
  }
}