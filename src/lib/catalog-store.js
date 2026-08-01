import { promises as fs } from "fs";
import path from "path";
import { allMovies as starterCatalog } from "@/lib/catalog";

const dataFile = path.join(process.cwd(), "data", "movie-catalog.json");

async function readCatalog() {
  try { return JSON.parse(await fs.readFile(dataFile, "utf8")); }
  catch (error) { if (error.code === "ENOENT") { await writeCatalog(starterCatalog); return starterCatalog; } throw error; }
}

async function writeCatalog(movies) {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(movies, null, 2), "utf8");
}

export async function getCatalog() { return readCatalog(); }
export async function saveCatalog(movies) { await writeCatalog(movies); return movies; }
export async function searchCatalog(query = "", category = "") {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedCategory = category.trim().toLowerCase();
  return (await readCatalog()).filter((movie) => {
    const searchable = `${movie.title} ${movie.genre || movie.category || ""} ${(movie.categories || []).join(" ")}`.toLowerCase();
    return (!normalizedQuery || searchable.includes(normalizedQuery)) && (!normalizedCategory || movie.categories?.some((item) => item.toLowerCase() === normalizedCategory));
  });
}
