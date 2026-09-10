import { requireAdmin } from "@/lib/admin-auth";
import { errorResponse, readJson } from "@/lib/api";
import { createSubscription, findUserById, revokePremium } from "@/lib/user-store";

const allowedPlans = new Set(["1-day", "1-week", "1-month", "3-months", "lifetime"]);

export async function PATCH(request) {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;
  try {
    const input = await readJson(request);
    const userId = String(input.userId || "").trim();
    const plan = String(input.plan || "").trim();
    if (!userId || !allowedPlans.has(plan)) return Response.json({ error: "User and valid Premium plan are required." }, { status: 400 });
    const user = await findUserById(userId);
    if (!user) return Response.json({ error: "User not found." }, { status: 404 });
    const subscription = await createSubscription(userId, plan, "admin");
    return Response.json({ success: true, subscription });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request) {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;
  try {
    const userId = String(new URL(request.url).searchParams.get("userId") || "").trim();
    if (!userId) return Response.json({ error: "User ID is required." }, { status: 400 });
    await revokePremium(userId);
    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}