import { authenticateRequest, getUserId, unauthorizedResponse } from "@/lib/auth";
import { errorResponse, rateLimit } from "@/lib/api";
import { getParty, validateRoomId } from "@/lib/watch-party";
import WatchParty from "@/models/WatchParty";
import { connectMongoose } from "@/lib/mongoose";

export async function POST(request, { params }) {
  const limited = rateLimit(request, 10);
  if (limited) return limited;
  const userId = getUserId(await authenticateRequest(request));
  if (!userId) return unauthorizedResponse();
  try {
    const roomId = validateRoomId((await params).roomId);
    const party = await getParty(roomId);
    if (!party) throw new Error("This Watch Party does not exist.");
    if (party.hostId !== userId) return Response.json({ error: "Only the host can end this Watch Party." }, { status: 403 });
    await connectMongoose();
    await WatchParty.updateOne({ roomId }, { $set: { status: "ended", lastActivityAt: new Date(), participants: [] } });
    return Response.json({ success: true });
  } catch (error) { return errorResponse(error, 404); }
}
