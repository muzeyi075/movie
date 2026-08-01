import { getCatalog, saveCatalog } from "@/lib/catalog-store";
import { removeFromWatchlist } from "@/lib/watchlist-store";

function toMovie(input, existing = {}) {
  const title = input.title?.trim();
  if (!title) throw new Error("A movie title is required.");
  const categories = Array.isArray(input.categories) ? input.categories : String(input.categories || "").split(",");
  const cleanCategories = categories.map((item) => item.trim()).filter(Boolean);
  if (!cleanCategories.length) throw new Error("Add at least one category.");
  return { ...existing, title, year: String(input.year || "2024"), rating: String(input.rating || "0.0"), categories: cleanCategories, genre: input.genre?.trim() || cleanCategories.join(" · "), image: input.image?.trim() || existing.image || "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=80" };
}

export async function GET() { return Response.json({ movies: await getCatalog() }); }

export async function POST(request) {
  try { const input = await request.json(); const movies = await getCatalog(); const id = input.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || crypto.randomUUID(); if (movies.some((movie) => movie.id === id)) return Response.json({ error: "A movie with that title already exists." }, { status: 409 }); const movie = { id, ...toMovie(input) }; await saveCatalog([movie, ...movies]); return Response.json({ movie }, { status: 201 }); }
  catch (error) { return Response.json({ error: error.message || "Could not create movie." }, { status: 400 }); }
}

export async function PATCH(request) {
  try { const input = await request.json(); const movies = await getCatalog(); const index = movies.findIndex((movie) => movie.id === input.id); if (index < 0) return Response.json({ error: "Movie not found." }, { status: 404 }); const movie = { id: movies[index].id, ...toMovie(input, movies[index]) }; movies[index] = movie; await saveCatalog(movies); return Response.json({ movie }); }
  catch (error) { return Response.json({ error: error.message || "Could not update movie." }, { status: 400 }); }
}

export async function DELETE(request) {
  const { id } = await request.json(); const movies = await getCatalog();
  if (!movies.some((movie) => movie.id === id)) return Response.json({ error: "Movie not found." }, { status: 404 });
  await saveCatalog(movies.filter((movie) => movie.id !== id)); await removeFromWatchlist(id);
  return Response.json({ success: true });
}
