import { getCatalog, searchCatalog } from "@/lib/catalog-store";

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q") ?? ""; const category = params.get("category") ?? "";
  const catalog = await getCatalog(); const results = await searchCatalog(query, category);
  return Response.json({ movies: results, total: results.length, trending: catalog.slice(-3).reverse() });
}
