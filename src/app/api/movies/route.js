import { getCatalog, searchCatalog } from "@/lib/catalog-store";

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q") ?? ""; const category = params.get("category") ?? "";
  const catalog = await getCatalog(); const results = await searchCatalog(query, category);
  const requestedPage = Number(params.get("page") || 1);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const requestedLimit = Number(params.get("limit") || 48);
  const limit = Number.isFinite(requestedLimit) ? Math.min(48, Math.max(1, requestedLimit)) : 48;
  const suggestions = query.trim().length >= 2 ? results.slice(0, 5).map((movie) => ({ id: movie.id, title: movie.title, image: movie.image })) : [];
  const categories = [...new Set(catalog.flatMap((movie) => movie.categories || []))].sort();
  return Response.json({ movies: results.slice((page - 1) * limit, page * limit), total: results.length, page, limit, trending: catalog.slice(-3).reverse(), suggestions, categories });
}
