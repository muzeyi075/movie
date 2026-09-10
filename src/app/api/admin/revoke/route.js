import { errorResponse, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { revokePremium } from "@/lib/user-store";

export async function POST(request) {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;

  try {
    const body = await readJson(request);
    const userId = String(body.userId || "").trim();
    if (!userId) return Response.json({ error: "User ID is required." }, { status: 400 });
    await revokePremium(userId);
    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
