import { getCatalog } from "@/lib/catalog-store";
import { addToWatchlist, getWatchlist, removeFromWatchlist } from "@/lib/watchlist-store";
import { authenticateRequest, getUserId, unauthorizedResponse } from "@/lib/auth";
import { errorResponse, readJson } from "@/lib/api";

async function response(movieIds) {
  const orderedIds = [...new Set(movieIds || [])].slice().reverse();
  const movies = await getCatalog();
  const orderedMovies = movies.filter((movie) => orderedIds.includes(movie.id)).sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));
  return Response.json({ movieIds: orderedIds, movies: orderedMovies });
}

export async function GET(request) {
  const decoded = await authenticateRequest(request);
  if (!decoded) return unauthorizedResponse();
  const uid = getUserId(decoded);
  return response(await getWatchlist(uid));
}

export async function POST(request) {
  try {
    const decoded = await authenticateRequest(request);
    if (!decoded) return unauthorizedResponse();
    const uid = getUserId(decoded);
    const { movieId } = await readJson(request);
    const movies = await getCatalog();
    if (typeof movieId !== "string" || !movies.some((movie) => movie.id === movieId)) return Response.json({ error: "Movie not found." }, { status: 404 });
    return response(await addToWatchlist(uid, movieId));
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request) {
  try {
    const decoded = await authenticateRequest(request);
    if (!decoded) return unauthorizedResponse();
    const uid = getUserId(decoded);
    const { movieId } = await readJson(request);
    if (typeof movieId !== "string") return Response.json({ error: "movieId is required." }, { status: 400 });
    return response(await removeFromWatchlist(uid, movieId));
  } catch (error) { return errorResponse(error); }
}
