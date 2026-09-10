import { authenticateRequest, getUserId, unauthorizedResponse } from "@/lib/auth";
import { errorResponse, rateLimit } from "@/lib/api";
import { getParty, publicParty } from "@/lib/watch-party";
import { getCatalog } from "@/lib/catalog-store";

export async function GET(request, { params }) {
  const limited = rateLimit(request, 60);
  if (limited) return limited;
  const decoded = await authenticateRequest(request);
  const userId = getUserId(decoded);
  if (!userId) return unauthorizedResponse();
  try {
    const party = await getParty((await params).roomId);
    if (!party || party.status !== "active") throw new Error("This Watch Party has ended or does not exist.");
    const movie = (await getCatalog()).find((item) => item.id === party.movieId) || null;
    return Response.json({ room: publicParty(party, movie) });
  } catch (error) { return errorResponse(error, 404); }
}
