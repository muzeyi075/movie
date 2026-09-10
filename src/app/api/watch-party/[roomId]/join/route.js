import { authenticateRequest, getUserId, unauthorizedResponse } from "@/lib/auth";
import { errorResponse, rateLimit } from "@/lib/api";
import { getParty, publicParty, validateRoomId } from "@/lib/watch-party";
import WatchParty from "@/models/WatchParty";
import { connectMongoose } from "@/lib/mongoose";
import { findUserById } from "@/lib/user-store";
import { getCatalog } from "@/lib/catalog-store";

export async function POST(request, { params }) {
  const limited = rateLimit(request, 20);
  if (limited) return limited;
  const decoded = await authenticateRequest(request);
  const userId = getUserId(decoded);
  if (!userId) return unauthorizedResponse();
  try {
    const roomId = validateRoomId((await params).roomId);
    const party = await getParty(roomId);
    if (!party) throw new Error("This Watch Party does not exist.");
    if (party.status !== "active") throw new Error("This Watch Party has ended.");
    const user = await findUserById(userId);
    await connectMongoose();
    const now = new Date();
    await WatchParty.updateOne({ roomId, status: "active" }, { $pull: { participants: { userId } }, $set: { lastActivityAt: now } });
    await WatchParty.updateOne({ roomId, status: "active" }, { $push: { participants: { userId, username: String(decoded.name || decoded.username || decoded.email || user?.username || "Cinemora User").slice(0, 80), joinedAt: now, lastSeen: now } } });
    const joined = await WatchParty.findOne({ roomId }).lean();
    return Response.json({ room: publicParty(joined, (await getCatalog()).find((movie) => movie.id === joined.movieId) || null) });
  } catch (error) { return errorResponse(error, 403); }
}
