import { getCatalog } from "@/lib/catalog-store";
import { clearHistory, getHistory, saveHistoryItem } from "@/lib/history-store";

async function response() { const catalog = await getCatalog(); const history = await getHistory(); return Response.json({ items: history.map((entry) => ({ ...entry, movie: catalog.find((movie) => movie.id === entry.movieId) })).filter((entry) => entry.movie) }); }
export async function GET() { return response(); }
export async function POST(request) { const { movieId, progress } = await request.json(); const catalog = await getCatalog(); if (!catalog.some((movie) => movie.id === movieId)) return Response.json({ error: "Movie not found." }, { status: 404 }); await saveHistoryItem({ movieId, progress: Math.min(100, Math.max(0, Number(progress) || 0)) }); return response(); }
export async function DELETE() { await clearHistory(); return Response.json({ success: true }); }
