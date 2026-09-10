import { customAlphabet } from "nanoid";
import sanitizeHtml from "sanitize-html";
import { connectMongoose } from "./mongoose.js";
import WatchParty from "../models/WatchParty.js";
import WatchPartyMessage from "../models/WatchPartyMessage.js";
import { getCatalog } from "./catalog-store.js";
import { findUserById, isPremiumActive } from "./user-store.js";

const createRoomCode = customAlphabet("0123456789ABCDEFGHJKLMNPQRSTUVWXYZ", 6);
const ROOM_ID_PATTERN = /^[A-Z0-9]{6,12}$/;
const ROOM_EXPIRY_MS = Number(process.env.WATCH_PARTY_EXPIRY_MINUTES || 30) * 60_000;

export function validateRoomId(roomId) {
  const normalized = String(roomId || "").trim().toUpperCase();
  if (!ROOM_ID_PATTERN.test(normalized)) throw new Error("Invalid watch party room.");
  return normalized;
}

export function cleanRoomName(name) {
  const value = String(name || "").replace(/[<>]/g, "").trim();
  if (!value || value.length > 100) throw new Error("Room name must be between 1 and 100 characters.");
  return value;
}

export function cleanMessage(message) {
  const value = sanitizeHtml(String(message || ""), { allowedTags: [], allowedAttributes: {} }).trim();
  if (!value || value.length > 500) throw new Error("Messages must be between 1 and 500 characters.");
  return value;
}

export async function getParty(roomId) {
  await connectMongoose();
  return WatchParty.findOne({ roomId: validateRoomId(roomId) }).lean();
}

export async function getAccessibleParty(roomId, userId) {
  const party = await getParty(roomId);
  if (!party) throw new Error("This Watch Party does not exist.");
  if (party.status !== "active") throw new Error("This Watch Party has ended.");
  if (party.privacy === "private" && !party.participants.some((participant) => participant.userId === userId) && party.hostId !== userId) {
    throw new Error("This private Watch Party requires an invitation.");
  }
  return party;
}

export async function assertMovieAccess(movieId, userId) {
  const movie = (await getCatalog()).find((item) => item.id === String(movieId));
  if (!movie) throw new Error("This movie is unavailable.");
  if (movie.premium && !isPremiumActive(await findUserById(userId))) throw new Error("You need an active Premium subscription to watch this movie.");
  return movie;
}

export async function createParty({ userId, username, movieId, name, privacy = "public", hostControlsPlayback = true }) {
  const movie = await assertMovieAccess(movieId, userId);
  const normalizedPrivacy = privacy === "private" ? "private" : "public";
  await connectMongoose();
  let roomId;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = createRoomCode();
    if (!(await WatchParty.exists({ roomId: candidate }))) { roomId = candidate; break; }
  }
  if (!roomId) throw new Error("Could not create a unique room. Please try again.");
  const now = new Date();
  const party = await WatchParty.create({ roomId, name: cleanRoomName(name || `${movie.title} Watch Party`), hostId: userId, movieId: movie.id, privacy: normalizedPrivacy, hostControlsPlayback: Boolean(hostControlsPlayback), participants: [{ userId, username: String(username || "Cinemora User").slice(0, 80), joinedAt: now, lastSeen: now }], lastActivityAt: now });
  return party.toObject();
}

export async function listPublicParties() {
  await connectMongoose();
  return WatchParty.find({ privacy: "public", status: "active", lastActivityAt: { $gte: new Date(Date.now() - ROOM_EXPIRY_MS) } }).sort({ createdAt: -1 }).limit(100).lean();
}

export async function recentMessages(roomId, before) {
  await connectMongoose();
  const query = { roomId: validateRoomId(roomId) };
  if (before) query.createdAt = { $lt: new Date(before) };
  return WatchPartyMessage.find(query).sort({ createdAt: -1 }).limit(100).lean().then((items) => items.reverse());
}

export async function addMessage({ roomId, userId, username, message }) {
  await connectMongoose();
  const record = await WatchPartyMessage.create({ roomId: validateRoomId(roomId), userId, username: String(username || "Cinemora User").slice(0, 80), message: cleanMessage(message) });
  return record.toObject();
}

export function publicParty(party, movie) {
  return { ...party, _id: undefined, movie, participantCount: party.participants?.length || 0, participants: (party.participants || []).map(({ userId, username, joinedAt, lastSeen }) => ({ userId, username, joinedAt, lastSeen })) };
}
