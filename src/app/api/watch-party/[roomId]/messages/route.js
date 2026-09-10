import { authenticateRequest, getUserId, unauthorizedResponse } from "@/lib/auth";
import { findUserById } from "@/lib/user-store";
import { errorResponse, rateLimit } from "@/lib/api";
import { addMessage, getAccessibleParty, recentMessages } from "@/lib/watch-party";

export async function GET(request, { params }) {
  const limited = rateLimit(request, 60);
  if (limited) return limited;
  const userId = getUserId(await authenticateRequest(request));
  if (!userId) return unauthorizedResponse();
  try {
    const party = await getAccessibleParty((await params).roomId, userId);
    const before = new URL(request.url).searchParams.get("before");
    return Response.json({ messages: await recentMessages(party.roomId, before) });
  } catch (error) { return errorResponse(error, 404); }
}

export async function POST(request, { params }) {
  const limited = rateLimit(request, 30);
  if (limited) return limited;
  const userId = getUserId(await authenticateRequest(request));
  if (!userId) return unauthorizedResponse();
  try {
    const party = await getAccessibleParty((await params).roomId, userId);
    if (!party.participants.some((participant) => participant.userId === userId) && party.hostId !== userId) {
      return Response.json({ error: "Join this Watch Party before sending messages." }, { status: 403 });
    }
    const body = await request.json();
    const participant = party.participants.find((item) => item.userId === userId);
    const decoded = await authenticateRequest(request);
    const user = await findUserById(userId);
    const message = await addMessage({
      roomId: party.roomId,
      userId,
      username: participant?.username || decoded?.name || decoded?.username || decoded?.email || user?.username || "Cinemora User",
      message: body.message,
    });
    return Response.json({ message }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 400);
  }
}
