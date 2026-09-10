import { MongoClient } from "mongodb";

const databaseName = process.env.MONGODB_DB || "cinemora";

let clientPromise = globalThis._mongoClientPromise;
let databasePromise = globalThis._cinemoraDatabasePromise;

const connectionOptions = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 10000,
  connectTimeoutMS: 10000,
};

async function connectWithRetry(uri) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const client = new MongoClient(uri, connectionOptions);
    try {
      return await client.connect();
    } catch (error) {
      lastError = error;
      await client.close().catch(() => {});
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw lastError;
}

export async function getDatabase() {
  if (!databasePromise) {
    if (!clientPromise) {
      const uri = process.env.MONGODB_URI;
      if (!uri) throw new Error("MONGODB_URI is not configured.");
      clientPromise = connectWithRetry(uri);
      globalThis._mongoClientPromise = clientPromise;
    }
    databasePromise = clientPromise.then(async (client) => {
      const database = client.db(databaseName);
      // This database backend accepts only one write operation at a time. Index
      // creation is a write, so running these in parallel causes startup requests
      // to fail with "Another write batch or compaction is already active".
      await database.collection("movies").createIndex({ id: 1 }, { unique: true });
      await database.collection("movies").createIndex({ title: "text", genre: "text", categories: "text" });
      await database.collection("watchlists").createIndex({ userId: 1 }, { unique: true });
      await database.collection("profiles").createIndex({ userId: 1 }, { unique: true });
      await database.collection("watchHistory").createIndex({ userId: 1, movieId: 1 }, { unique: true });
      await database.collection("watchHistory").createIndex({ userId: 1, watchedAt: -1 });
      await database.collection("premiumSettings").createIndex({ key: 1 }, { unique: true });
      await database.collection("premiumTokens").createIndex({ tokenHash: 1 }, { unique: true });
      return database;
    });
    globalThis._cinemoraDatabasePromise = databasePromise;
  }
  try {
    return await databasePromise;
  } catch (error) {
    clientPromise = null;
    databasePromise = null;
    globalThis._mongoClientPromise = null;
    globalThis._cinemoraDatabasePromise = null;
    throw error;
  }
}
