import { allMovies as starterCatalog } from "./catalog.js";
import { getDatabase } from "./mongodb.js";

async function collection() { return (await getDatabase()).collection("movies"); }

// Keep catalog mutations in a single process-wide queue. In development several
// routes can arrive together, and this datastore permits only one writer.
let catalogWriteQueue = Promise.resolve();
function queueCatalogWrite(operation) {
  const task = catalogWriteQueue.then(operation, operation);
  // Preserve the queue after a rejected operation so later writes can proceed.
  catalogWriteQueue = task.catch(() => {});
  return task;
}

async function readCatalog() {
  const movies = await (await collection()).find({}, { projection: { _id: 0 } }).toArray();
  if (movies.length) return movies;
  // Re-check inside the queue: concurrent first requests all see an empty
  // collection before the first seed has completed.
  return queueCatalogWrite(async () => {
    const moviesCollection = await collection();
    const existing = await moviesCollection.find({}, { projection: { _id: 0 } }).toArray();
    if (existing.length) return existing;
    await writeCatalog(starterCatalog);
    return starterCatalog;
  });
}

async function writeCatalog(movies) {
  const moviesCollection = await collection();
  const ids = movies.map((movie) => movie.id);
  await moviesCollection.deleteMany(ids.length ? { id: { $nin: ids } } : {});
  if (movies.length) await moviesCollection.bulkWrite(movies.map((movie) => ({ replaceOne: { filter: { id: movie.id }, replacement: movie, upsert: true } })));
}

export async function getCatalog() { return readCatalog(); }
export async function saveCatalog(movies) {
  await queueCatalogWrite(() => writeCatalog(movies));
  return movies;
}
export async function searchCatalog(query = "", category = "") {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedCategory = category.trim().toLowerCase();
  return (await readCatalog()).map((movie) => {
    const searchable = `${movie.title} ${movie.genre || movie.category || ""} ${(movie.categories || []).join(" ")}`.toLowerCase();
    const matches = (!normalizedQuery || searchable.includes(normalizedQuery)) && (!normalizedCategory || movie.categories?.some((item) => item.toLowerCase() === normalizedCategory));
    const title = movie.title.toLowerCase();
    const score = !normalizedQuery ? 0 : (title === normalizedQuery ? 100 : 0) + (title.startsWith(normalizedQuery) ? 60 : 0) + (title.includes(normalizedQuery) ? 30 : 0) + ((movie.categories || []).some((item) => item.toLowerCase().includes(normalizedQuery)) ? 15 : 0) + ((movie.genre || movie.category || "").toLowerCase().includes(normalizedQuery) ? 10 : 0);
    return { movie, matches, score };
  }).filter(({ matches }) => matches).sort((a, b) => b.score - a.score || Number(b.movie.rating || 0) - Number(a.movie.rating || 0)).map(({ movie }) => movie);
}
