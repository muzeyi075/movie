import { promises as fs } from "fs";
import path from "path";

const dataFile = path.join(process.cwd(), "data", "watchlist.json");

async function readWatchlist() {
  try { return JSON.parse(await fs.readFile(dataFile, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
}

async function writeWatchlist(items) {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(items, null, 2), "utf8");
}

export async function getWatchlist() { return readWatchlist(); }
export async function addToWatchlist(movieId) { const items = await readWatchlist(); if (!items.includes(movieId)) { items.push(movieId); await writeWatchlist(items); } return items; }
export async function removeFromWatchlist(movieId) { const items = (await readWatchlist()).filter((item) => item !== movieId); await writeWatchlist(items); return items; }
