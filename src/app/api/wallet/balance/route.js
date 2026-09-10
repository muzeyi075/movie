import { authenticateRequest, getUserId, unauthorizedResponse } from "@/lib/auth";
import { ensureUserWallet } from "@/lib/solana/wallet-service";
import { getWalletBalance } from "@/lib/solana/balance";
import { scanUserWalletDeposits } from "@/lib/solana/deposits";
import { connectMongoose } from "@/lib/mongoose";
import Deposit from "@/models/Deposit";

export async function GET(request) {
  const decoded = await authenticateRequest(request);
  if (!decoded) return unauthorizedResponse();
  try {
    const userId = getUserId(decoded);
    if (!userId) return unauthorizedResponse();
    const wallet = await ensureUserWallet({ userId, email: decoded.email || "" });
    try {
      await scanUserWalletDeposits({ userId, walletAddress: wallet.walletAddress, limit: 25, commitment: "finalized" });
    } catch {
      // Balance still returns even if deposit scan fails.
    }
    const solBalance = await getWalletBalance(wallet.walletAddress);

    // Get available balance from deposits (money available for movies)
    await connectMongoose();
    const deposits = await Deposit.find({
      userId,
      status: "finalized"
    });

    let availableBalance = 0;
    for (const deposit of deposits) {
      const remaining = deposit.amount - (deposit.spentAmount || 0);
      availableBalance += Math.max(0, remaining);
    }

    return Response.json({
      walletAddress: wallet.walletAddress,
      solBalance,
      availableForMovies: availableBalance,
      totalDeposited: deposits.reduce((sum, d) => sum + d.amount, 0),
      totalSpent: deposits.reduce((sum, d) => sum + (d.spentAmount || 0), 0)
    });
  } catch (error) {
    return Response.json({ error: error.message || "Wallet balance unavailable." }, { status: 503 });
  }
}