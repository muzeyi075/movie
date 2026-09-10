import { readJson } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth-session";
import { upsertUser } from "@/lib/user-store";
import { ensureUserWallet } from "@/lib/solana/wallet-service";

export async function POST(request) {
  try {
    const body = await readJson(request);
    const email = String(body.email || "").trim().toLowerCase();
    const username = String(body.username || body.name || "Cinemora User").trim();
    const avatar = String(body.avatar || body.photoURL || "").trim() || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80";
    if (!email) return Response.json({ error: "Email is required." }, { status: 400 });

    const user = await upsertUser({
      userId: `google_${email}`,
      username,
      email,
      avatar,
      authType: "google",
      premium: false,
      premiumPlan: "free",
      premiumExpiresAt: null,
    });
    const wallet = await ensureUserWallet({ userId: user.userId, username: user.username, email: user.email });

    const response = Response.json({ user, wallet: { walletAddress: wallet.walletAddress }, ok: true });
    return setSessionCookie(response, user);
  } catch (error) {
    return Response.json({ error: error.message || "Google sign-in failed." }, { status: 400 });
  }
}
