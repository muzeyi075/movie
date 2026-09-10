import { getCatalog } from "@/lib/catalog-store";

export async function GET(_request, { params }) {
  const { movieId } = await params;
  const movies = await getCatalog();
  const movie = movies.find((item) => item.id === movieId);

  if (!movie) return Response.json({ error: "Movie not found." }, { status: 404 });

  const related = movies
    .filter((item) => item.id !== movie.id)
    .map((item) => ({ item, sharedCategories: item.categories?.filter((category) => movie.categories?.includes(category)).length || 0 }))
    .sort((a, b) => b.sharedCategories - a.sharedCategories)
    .map(({ item }) => item)
    .slice(0, 6);

  return Response.json({ movie, related });
}
