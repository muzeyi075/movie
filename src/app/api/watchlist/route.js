import { getCatalog } from "@/lib/catalog-store";
import { addToWatchlist, getWatchlist, removeFromWatchlist } from "@/lib/watchlist-store";

async function response(movieIds) { const movies = await getCatalog(); return Response.json({ movieIds, movies: movies.filter((movie) => movieIds.includes(movie.id)) }); }
export async function GET() { return response(await getWatchlist()); }
export async function POST(request) { const { movieId } = await request.json(); const movies = await getCatalog(); if (!movies.some((movie) => movie.id === movieId)) return Response.json({ error: "Movie not found" }, { status: 404 }); return response(await addToWatchlist(movieId)); }
export async function DELETE(request) { const { movieId } = await request.json(); return response(await removeFromWatchlist(movieId)); }
