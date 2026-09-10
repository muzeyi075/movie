import { getCatalog, saveCatalog } from "@/lib/catalog-store";
import { removeFromWatchlist } from "@/lib/watchlist-store";
import { removeFromHistory } from "@/lib/history-store";
import { errorResponse, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";

function toMovie(input, existing = {}) {
  const title = input.title?.trim();
  if (!title) throw new Error("A movie title is required.");
  const categories = Array.isArray(input.categories) ? input.categories : String(input.categories || "").split(",");
  const cleanCategories = categories.map((item) => item.trim()).filter(Boolean);
  if (!cleanCategories.length) throw new Error("Add at least one category.");
  if (input.videoUrl?.trim()) existing = { ...existing, videoUrl: input.videoUrl.trim() };
  if (input.description?.trim()) existing = { ...existing, description: input.description.trim() };
  if (input.duration?.trim()) existing = { ...existing, duration: input.duration.trim() };
  return {
    ...existing,
    title,
    year: String(input.year || "2024"),
    rating: String(input.rating || "0.0"),
    categories: cleanCategories,
    genre: input.genre?.trim() || cleanCategories.join(" · "),
    image: input.image?.trim() || existing.image || "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=80",
    addedAt: existing.addedAt || new Date().toISOString()
  };
}

export async function GET(request) {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;
  try {
    return Response.json({ movies: await getCatalog() });
  } catch (error) {
    return errorResponse(error, 500);
  }
}

export async function POST(request) {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;
  try { const input = await readJson(request); const movies = await getCatalog(); const id = input.title?.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || crypto.randomUUID(); if (movies.some((movie) => movie.id === id)) return Response.json({ error: "A movie with that title already exists." }, { status: 409 }); const movie = { id, ...toMovie(input) }; await saveCatalog([movie, ...movies]); return Response.json({ movie }, { status: 201 }); }
  catch (error) { return errorResponse(error); }
}

export async function PATCH(request) {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;
  try { const input = await readJson(request); const movies = await getCatalog(); const index = movies.findIndex((movie) => movie.id === input.id); if (index < 0) return Response.json({ error: "Movie not found." }, { status: 404 }); const movie = { id: movies[index].id, ...toMovie(input, movies[index]) }; movies[index] = movie; await saveCatalog(movies); return Response.json({ movie }); }
  catch (error) { return errorResponse(error); }
}

export async function DELETE(request) {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;
  try {
    const { id } = await readJson(request); const movies = await getCatalog();
    if (typeof id !== "string" || !movies.some((movie) => movie.id === id)) return Response.json({ error: "Movie not found." }, { status: 404 });
    await saveCatalog(movies.filter((movie) => movie.id !== id)); await Promise.all([removeFromWatchlist(id), removeFromHistory(id)]);
    return Response.json({ success: true });
  } catch (error) { return errorResponse(error); }
}
