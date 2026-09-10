import { authenticateRequest, getUserId, unauthorizedResponse } from "@/lib/auth";
import { errorResponse, rateLimit, readJson } from "@/lib/api";
import { assertMovieAccess, createParty, listPublicParties, publicParty } from "@/lib/watch-party";
import { findUserById } from "@/lib/user-store";
import { getCatalog } from "@/lib/catalog-store";

export async function GET(request) {
  const limited = rateLimit(request, 60);
  if (limited) return limited;
  try {
    const parties = await listPublicParties();
    const movies = await getCatalog();
    return Response.json({ rooms: parties.map((party) => publicParty(party, movies.find((movie) => movie.id === party.movieId) || null)) });
  } catch (error) { return errorResponse(error, 500); }
}

export async function POST(request) {
  const limited = rateLimit(request, 10);
  if (limited) return limited;
  const decoded = await authenticateRequest(request);
  const userId = getUserId(decoded);
  if (!userId) return unauthorizedResponse();
  try {
    const input = await readJson(request);
    await assertMovieAccess(input.movieId, userId);
    const user = await findUserById(userId);
    const party = await createParty({ userId, username: decoded.name || decoded.email || user?.username, movieId: input.movieId, name: input.name, privacy: input.privacy, hostControlsPlayback: input.hostControlsPlayback });
    return Response.json({ room: publicParty(party, (await getCatalog()).find((movie) => movie.id === party.movieId) || null) }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
