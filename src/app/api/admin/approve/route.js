import { errorResponse, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { createSubscription, findUserByEmail, findUserById, findUserBySessionId, listPayments, updatePaymentStatus } from "@/lib/user-store";

export async function POST(request) {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;

  try {
    const input = await readJson(request);
    const paymentId = String(input.paymentId || "").trim();
    const plan = String(input.plan || "1-month").trim();

    if (!paymentId) return Response.json({ error: "Payment ID is required." }, { status: 400 });

    const payments = await listPayments();
    const payment = payments.find((item) => item.paymentId === paymentId);
    if (!payment) return Response.json({ error: "Payment not found." }, { status: 404 });

    if (input.status === "rejected") {
      await updatePaymentStatus(paymentId, "rejected", "admin");
      return Response.json({ success: true, payment: { ...payment, status: "rejected" } });
    }

    const user = (payment.email ? await findUserByEmail(payment.email) : null)
      || (payment.userId && payment.userId !== "guest" ? await findUserById(payment.userId) : null)
      || (payment.sessionId ? await findUserBySessionId(payment.sessionId) : null);

    if (user?.userId) {
      await createSubscription(user.userId, plan || payment.plan || "1-month", "admin");
    }

    const selectedPlan = plan || payment.plan || "1-month";
    const updated = await updatePaymentStatus(paymentId, "approved", "admin", selectedPlan);
    return Response.json({ success: true, payment: updated, plan: selectedPlan, userId: user?.userId || null });
  } catch (error) {
    return errorResponse(error);
  }
}
