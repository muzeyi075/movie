import { errorResponse, readJson } from "@/lib/api";
import { authenticateRequest, getUserId } from "@/lib/auth";
import { createPayment } from "@/lib/user-store";
import { getPremiumConfig } from "@/lib/premium-store";

const allowedPlans = new Set(["1-day", "1-week", "1-month", "3-months", "lifetime"]);

export async function POST(request) {
  try {
    const decoded = await authenticateRequest(request);
    const input = await readJson(request);
    const username = String(input.username || "").trim();
    const email = String(input.email || "").trim().toLowerCase();
    const plan = String(input.plan || "1-month").trim();
    const phoneNumber = String(input.phoneNumber || "").trim();
    const transactionId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const amount = Number(input.amount || 0);
    const config = await getPremiumConfig();
    const expectedAmount = Number(config.planPrices?.[plan] || config.amount || 0);
    const userId = decoded ? getUserId(decoded) : null;
    const sessionId = decoded?.sessionId || input.sessionId || null;

    if (!phoneNumber) return Response.json({ error: "Phone number is required." }, { status: 400 });
    if (!allowedPlans.has(plan)) return Response.json({ error: "Choose a valid Premium plan." }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) return Response.json({ error: "Amount must be greater than zero." }, { status: 400 });
    if (amount !== expectedAmount) return Response.json({ error: `The selected plan costs ${expectedAmount} UGX.` }, { status: 400 });

    const payment = await createPayment({
      username: username || input.name || "",
      email: email || (decoded?.email || ""),
      plan,
      phoneNumber,
      amount,
      transactionId,
      userId: userId || username || email || "guest",
      sessionId,
      authType: decoded?.authType || input.authType || null,
      notes: "Pending manual verification"
    });

    return Response.json({ success: true, paymentId: payment.paymentId, message: "Payment request created and is pending admin review.", payment });
  } catch (error) {
    return errorResponse(error);
  }
}
