import { getDatabase } from "@/lib/mongodb";

async function collection() { return (await getDatabase()).collection("watchHistory"); }
async function readHistory(userId = "default") { return (await (await collection()).find({ userId }, { projection: { _id: 0, userId: 0 } }).sort({ watchedAt: -1 }).limit(12).toArray()); }
async function writeHistory(userId = "default", items) { const history = await collection(); await history.deleteMany({ userId }); if (items.length) await history.insertMany(items.map((item) => ({ ...item, userId, watchedAt: new Date() }))); }
export async function getHistory(userId = "default") { return readHistory(userId); }
export async function saveHistoryItem(userId = "default", item) { const history = await collection(); await history.updateOne({ userId, movieId: item.movieId }, { $set: { ...item, userId, watchedAt: new Date() } }, { upsert: true }); return readHistory(userId); }
export async function clearHistory(userId = "default") { await writeHistory(userId, []); }
export async function removeFromHistory(userId = "default", movieId) { await (await collection()).deleteMany({ userId, movieId }); }
