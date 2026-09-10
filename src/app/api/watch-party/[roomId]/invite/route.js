import { authenticateRequest, getUserId, unauthorizedResponse } from "@/lib/auth";
import { errorResponse, rateLimit } from "@/lib/api";
import { getAccessibleParty } from "@/lib/watch-party";

export async function POST(request, { params }) {
  const limited = rateLimit(request, 20);
  if (limited) return limited;
  const userId = getUserId(await authenticateRequest(request));
  if (!userId) return unauthorizedResponse();
  try {
    const party = await getAccessibleParty((await params).roomId, userId);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    return Response.json({ url: `${baseUrl}/watch-party/${party.roomId}`, roomName: party.name, privacy: party.privacy });
  } catch (error) { return errorResponse(error, 404); }
}
