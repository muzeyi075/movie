import mongoose from "mongoose";

const globalMongoose = globalThis.__cinemoraMongoose || { connection: null, promise: null };
globalThis.__cinemoraMongoose = globalMongoose;

export async function connectMongoose() {
  if (globalMongoose.connection?.readyState === 1) return globalMongoose.connection;
  if (!globalMongoose.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not configured.");
    globalMongoose.promise = mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB || "cinemora",
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
    }).then((connection) => {
      globalMongoose.connection = connection.connection;
      return connection.connection;
    }).catch((error) => {
      globalMongoose.promise = null;
      throw error;
    });
  }
  return globalMongoose.promise;
}