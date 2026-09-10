import { getCatalog } from "@/lib/catalog-store";
import { clearHistory, getHistory, saveHistoryItem } from "@/lib/history-store";
import { authenticateRequest, getUserId, unauthorizedResponse } from "@/lib/auth";
import { errorResponse, readJson } from "@/lib/api";

async function response(uid) { const catalog = await getCatalog(); const history = await getHistory(uid); return Response.json({ items: history.map((entry) => ({ ...entry, movie: catalog.find((movie) => movie.id === entry.movieId) })).filter((entry) => entry.movie) }); }

export async function GET(request) {
  const decoded = await authenticateRequest(request);
  if (!decoded) return unauthorizedResponse();
  const uid = getUserId(decoded);
  return response(uid);
}

export async function POST(request) {
  try {
    const decoded = await authenticateRequest(request);
    if (!decoded) return unauthorizedResponse();
    const uid = getUserId(decoded);
    const { movieId, progress } = await readJson(request);
    const catalog = await getCatalog();
    if (typeof movieId !== "string" || !catalog.some((movie) => movie.id === movieId)) return Response.json({ error: "Movie not found." }, { status: 404 });
    await saveHistoryItem(uid, { movieId, progress: Math.min(100, Math.max(0, Number(progress) || 0)) });
    return response(uid);
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request) {
  const decoded = await authenticateRequest(request);
  if (!decoded) return unauthorizedResponse();
  const uid = getUserId(decoded);
  await clearHistory(uid);
  return Response.json({ success: true });
}
