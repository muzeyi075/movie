import { authenticateRequest, getUserId, unauthorizedResponse } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { listUserSubscriptions } from "@/lib/user-store";

export async function GET(request) {
  const decoded = await authenticateRequest(request);
  const userId = getUserId(decoded);
  if (!userId) return unauthorizedResponse();
  try {
    return Response.json({ subscriptions: await listUserSubscriptions(userId) });
  } catch (error) {
    return errorResponse(error);
  }
}