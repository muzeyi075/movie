import { authenticateRequest, getUserId, unauthorizedResponse } from "@/lib/auth";
import { errorResponse, rateLimit } from "@/lib/api";
import { getParty, validateRoomId } from "@/lib/watch-party";
import WatchParty from "@/models/WatchParty";
import { connectMongoose } from "@/lib/mongoose";

export async function POST(request, { params }) {
  const limited = rateLimit(request, 30);
  if (limited) return limited;
  const userId = getUserId(await authenticateRequest(request));
  if (!userId) return unauthorizedResponse();
  try {
    const roomId = validateRoomId((await params).roomId);
    const party = await getParty(roomId);
    if (!party || party.status !== "active") throw new Error("This Watch Party has ended.");
    await connectMongoose();
    await WatchParty.updateOne({ roomId }, { $pull: { participants: { userId } }, $set: { lastActivityAt: new Date() } });
    return Response.json({ success: true });
  } catch (error) { return errorResponse(error, 404); }
}
