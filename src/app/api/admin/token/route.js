import { errorResponse, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { generatePremiumToken, hashToken } from "@/lib/premium";
import { getPremiumConfig } from "@/lib/premium-store";
import { getIssuedTokenByTransactionId, saveIssuedToken } from "@/lib/premium-store";
import { listPayments } from "@/lib/user-store";

export async function POST(request) {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;

  try {
    const input = await readJson(request);
    const paymentId = String(input.paymentId || "").trim();
    if (!paymentId) return Response.json({ error: "Payment ID is required." }, { status: 400 });

    const payment = (await listPayments()).find((item) => item.paymentId === paymentId);
    if (!payment) return Response.json({ error: "Payment not found." }, { status: 404 });
    if (payment.status !== "approved") return Response.json({ error: "Approve the payment before generating an access token." }, { status: 409 });
    const config = await getPremiumConfig();
    const token = generatePremiumToken();
    const expiresAt = new Date(Date.now() + Number(config.tokenExpiryMinutes || 15) * 60_000).toISOString();
    const transactionId = `${payment.transactionId}:access:${Date.now()}`;
    const existing = await getIssuedTokenByTransactionId(transactionId);
    if (!existing) {
      await saveIssuedToken({
        userId: payment.userId && payment.userId !== "guest" ? payment.userId : null,
        plan: payment.plan,
        phoneNumber: payment.phoneNumber,
        amount: payment.amount,
        transactionId,
        tokenHash: hashToken(token),
        expiresAt,
      });
    }

    return Response.json({ success: true, token, expiresAt, phoneNumber: payment.phoneNumber });
  } catch (error) {
    return errorResponse(error);
  }
}