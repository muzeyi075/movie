import { readJson } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth-session";
import { upsertUser } from "@/lib/user-store";
import { ensureUserWallet } from "@/lib/solana/wallet-service";

export async function POST(request) {
  try {
    const body = await readJson(request);
    const publicKey = String(body.publicKey || "").trim();
    const sessionId = String(body.sessionId || "").trim();
    const username = String(body.username || "Cinemora User").trim();
    if (!publicKey) return Response.json({ error: "Public key is required." }, { status: 400 });
    if (!/^pk[0-9a-fA-F]{64}$/.test(sessionId)) return Response.json({ error: "A valid 66-character Session ID is required." }, { status: 400 });

    const user = await upsertUser({
      userId: sessionId,
      sessionId,
      username,
      publicKey,
      avatar: body.avatar || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
      authType: "crypto",
      premium: false,
      premiumPlan: "free",
      premiumExpiresAt: null,
    });
    let wallet = null;
    try {
      wallet = await ensureUserWallet({ userId: user.userId, username: user.username, email: user.email || "" });
    } catch {
      // Account authentication should not fail when wallet provisioning is temporarily unavailable.
    }

    const response = Response.json({ user, wallet: wallet ? { walletAddress: wallet.walletAddress } : null, ok: true });
    return setSessionCookie(response, user);
  } catch (error) {
    return Response.json({ error: error.message || "Crypto registration failed." }, { status: 400 });
  }
}
