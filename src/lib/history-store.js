import { promises as fs } from "fs";
import path from "path";

const dataFile = path.join(process.cwd(), "data", "watch-history.json");
async function readHistory() { try { return JSON.parse(await fs.readFile(dataFile, "utf8")); } catch (error) { if (error.code === "ENOENT") return []; throw error; } }
async function writeHistory(items) { await fs.mkdir(path.dirname(dataFile), { recursive: true }); await fs.writeFile(dataFile, JSON.stringify(items, null, 2), "utf8"); }
export async function getHistory() { return readHistory(); }
export async function saveHistoryItem(item) { const items = await readHistory(); const next = [{ ...item, watchedAt: new Date().toISOString() }, ...items.filter((entry) => entry.movieId !== item.movieId)].slice(0, 12); await writeHistory(next); return next; }
export async function clearHistory() { await writeHistory([]); }
