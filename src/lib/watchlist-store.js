import { getDatabase } from "@/lib/mongodb";

async function collection() { return (await getDatabase()).collection("watchlists"); }

async function readWatchlist(userId = "default") {
  return (await (await collection()).findOne({ userId }, { projection: { _id: 0, movieIds: 1 } }))?.movieIds || [];
}

async function writeWatchlist(userId = "default", items) {
  await (await collection()).updateOne({ userId }, { $set: { movieIds: items, updatedAt: new Date() } }, { upsert: true });
}

export async function getWatchlist(userId = "default") { return readWatchlist(userId); }
export async function addToWatchlist(userId = "default", movieId) {
  const items = await readWatchlist(userId);
  const nextItems = items.filter((item) => item !== movieId);
  nextItems.unshift(movieId);
  await writeWatchlist(userId, nextItems);
  return nextItems;
}
export async function removeFromWatchlist(userId = "default", movieId) { const items = (await readWatchlist(userId)).filter((item) => item !== movieId); await writeWatchlist(userId, items); return items; }
