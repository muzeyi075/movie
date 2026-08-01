import { allMovies, movies, trending } from "@/lib/catalog";

export async function GET(request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  const results = query ? allMovies.filter((movie) => `${movie.title} ${movie.genre || movie.category} ${movie.categories.join(" ")}`.toLowerCase().includes(query)) : movies;
  return Response.json({ movies: results, trending });
}
