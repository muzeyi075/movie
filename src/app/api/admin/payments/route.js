import { requireAdmin } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/api";
import { deletePayment, listPayments } from "@/lib/user-store";

export async function GET(request) {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;
  try {
    return Response.json({ payments: await listPayments() });
  } catch (error) {
    return errorResponse(error, 500);
  }
}

export async function DELETE(request) {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;
  try {
    const body = await request.json();
    const paymentId = String(body.paymentId || "").trim();
    if (!paymentId) return Response.json({ error: "Payment ID is required." }, { status: 400 });
    const deleted = await deletePayment(paymentId);
    if (!deleted) return Response.json({ error: "Payment not found." }, { status: 404 });
    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error, 400);
  }
}
