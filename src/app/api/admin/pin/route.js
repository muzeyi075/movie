import { requireAdmin } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/api";
import { generatePremiumToken, hashToken } from "@/lib/premium";
import { getPremiumConfig, saveIssuedToken } from "@/lib/premium-store";

const allowedPlans = new Set(["1-day", "1-week", "1-month", "3-months", "lifetime"]);

export async function POST(request) {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;

  try {
    const body = await request.json().catch(() => ({}));
    const plan = String(body.plan || "1-month").trim();
    if (!allowedPlans.has(plan)) return Response.json({ error: "Choose a valid Premium plan." }, { status: 400 });
    const config = await getPremiumConfig();
    const token = generatePremiumToken();
    const expiresAt = new Date(Date.now() + Number(config.tokenExpiryMinutes || 15) * 60_000).toISOString();
    const transactionId = `admin-pin:${Date.now()}:${token.slice(0, 12)}`;

    await saveIssuedToken({
      userId: null,
      plan,
      phoneNumber: "",
      amount: 0,
      transactionId,
      tokenHash: hashToken(token),
      expiresAt,
    });

    return Response.json({ success: true, pin: token, plan, expiresAt });
  } catch (error) {
    return errorResponse(error);
  }
}
