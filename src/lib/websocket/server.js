import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { adminAuth } from "../firebase-admin.js";
import { verifySessionToken } from "../auth-session.js";
import { addMessage, getParty, validateRoomId } from "../watch-party.js";
import WatchParty from "../../models/WatchParty.js";
import { connectMongoose } from "../mongoose.js";

const rooms = new Map();
const eventWindows = new Map();
const MAX_EVENT_RATE = 40;
const ROOM_EXPIRY_MS = Number(process.env.WATCH_PARTY_EXPIRY_MINUTES || 30) * 60_000;

function log(event, data = {}) { console.info(`[watch-party] ${event}`, data); }
function roomState(roomId) { if (!rooms.has(roomId)) rooms.set(roomId, { playing: false, position: 0, updatedAt: Date.now() }); return rooms.get(roomId); }
function eventAllowed(userId) {
  const now = Date.now();
  const record = eventWindows.get(userId);
  if (!record || now - record.startedAt > 60_000) { eventWindows.set(userId, { startedAt: now, count: 1 }); return true; }
  record.count += 1;
  return record.count <= MAX_EVENT_RATE;
}
function currentPosition(state) { return state.position + (state.playing ? (Date.now() - state.updatedAt) / 1000 : 0); }
function playbackPayload(roomId) { const state = roomState(roomId); return { roomId, position: currentPosition(state), timestamp: Date.now(), playing: state.playing }; }
async function persistPlayback(roomId, state) { await connectMongoose(); await WatchParty.updateOne({ roomId, status: "active" }, { $set: { "playback.playing": state.playing, "playback.position": currentPosition(state), "playback.updatedAt": new Date(), lastActivityAt: new Date() } }); }

async function authenticateSocket(socket) {
  const token = socket.handshake.auth?.token;
  if (token) return adminAuth.verifyIdToken(token);
  const cookie = socket.handshake.headers.cookie || "";
  const value = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("cinemora_session="));
  return verifySessionToken(value?.split("=").slice(1).join("=") ? decodeURIComponent(value.split("=").slice(1).join("=")) : null);
}

export function attachWatchPartySocket(httpServer) {
  const io = new Server(httpServer, { path: "/socket.io", cors: { origin: process.env.NEXT_PUBLIC_APP_URL || true, credentials: true } });
  if (process.env.REDIS_URL) {
    const pubClient = new Redis(process.env.REDIS_URL);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    log("redis adapter enabled");
  }
  io.use(async (socket, next) => {
    try {
      const decoded = await authenticateSocket(socket);
      const userId = decoded?.uid || decoded?.userId;
      if (!userId) return next(new Error("Authentication required."));
      socket.user = { userId, username: String(decoded.name || decoded.username || decoded.email || "Cinemora User").slice(0, 80) };
      return next();
    } catch { return next(new Error("Authentication required.")); }
  });

  io.on("connection", (socket) => {
    socket.on("room:join", async ({ roomId } = {}, callback = () => {}) => {
      try {
        if (!eventAllowed(socket.user.userId)) throw new Error("Rate limit exceeded.");
        const normalizedRoomId = validateRoomId(roomId);
        const party = await getParty(normalizedRoomId);
        if (!party || party.status !== "active") throw new Error("This Watch Party has ended or does not exist.");
        if (party.privacy === "private" && !party.participants.some((participant) => participant.userId === socket.user.userId)) throw new Error("Join this private room through its invitation first.");
        socket.join(normalizedRoomId);
        socket.data.roomId = normalizedRoomId;
        const state = roomState(normalizedRoomId);
        socket.emit("video:sync", playbackPayload(normalizedRoomId));
        io.to(normalizedRoomId).emit("user:join", { userId: socket.user.userId, username: socket.user.username });
        callback({ ok: true, roomId: normalizedRoomId });
        log("room joined", { roomId: normalizedRoomId, userId: socket.user.userId });
      } catch (error) { callback({ ok: false, error: error.message }); }
    });

    socket.on("room:leave", () => { if (socket.data.roomId) socket.leave(socket.data.roomId); socket.data.roomId = null; });
    socket.on("video:sync", () => { if (socket.data.roomId) socket.emit("video:sync", playbackPayload(socket.data.roomId)); });
    socket.on("video:play", async ({ position } = {}, callback = () => {}) => handlePlayback("play", socket, position, io, callback));
    socket.on("video:pause", async ({ position } = {}, callback = () => {}) => handlePlayback("pause", socket, position, io, callback));
    socket.on("video:seek", async ({ position } = {}, callback = () => {}) => handlePlayback("seek", socket, position, io, callback));

    socket.on("chat:message", async ({ message } = {}, callback = () => {}) => {
      try {
        if (!socket.data.roomId || !eventAllowed(socket.user.userId)) throw new Error("Rate limit exceeded.");
        const record = await addMessage({ roomId: socket.data.roomId, userId: socket.user.userId, username: socket.user.username, message });
        io.to(socket.data.roomId).emit("chat:message", record);
        callback({ ok: true });
      } catch (error) { log("chat rejected", { userId: socket.user.userId, reason: error.message }); callback({ ok: false, error: error.message }); }
    });

    socket.on("reaction:send", ({ reaction } = {}, callback = () => {}) => {
      const valid = ["❤️", "😂", "🔥", "😱", "👏", "😮"];
      if (!socket.data.roomId || !valid.includes(reaction) || !eventAllowed(socket.user.userId)) return callback({ ok: false, error: "Reaction unavailable." });
      io.to(socket.data.roomId).emit("reaction:send", { reaction, userId: socket.user.userId, username: socket.user.username, createdAt: new Date().toISOString() });
      callback({ ok: true });
    });

    socket.on("disconnect", async () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      io.to(roomId).emit("user:leave", { userId: socket.user.userId });
      try {
        const party = await getParty(roomId);
        if (party?.hostId === socket.user.userId && party.participants.length > 1) {
          const replacement = party.participants.filter((participant) => participant.userId !== socket.user.userId).sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt))[0];
          await connectMongoose();
          await WatchParty.updateOne({ roomId }, { $set: { hostId: replacement.userId } });
          io.to(roomId).emit("room:host-transferred", { userId: replacement.userId, username: replacement.username });
          log("host transferred", { roomId, userId: replacement.userId });
        }
      } catch (error) { log("disconnect handling failed", { roomId, error: error.message }); }
      log("user disconnected", { roomId, userId: socket.user.userId });
    });
  });
  return io;
}

async function handlePlayback(action, socket, position, io, callback) {
  try {
    if (!socket.data.roomId || !eventAllowed(socket.user.userId)) throw new Error("Rate limit exceeded.");
    const party = await getParty(socket.data.roomId);
    if (!party || party.status !== "active") throw new Error("This Watch Party has ended.");
    if (party.hostControlsPlayback && party.hostId !== socket.user.userId) throw new Error("Only the host controls playback.");
    const numericPosition = Number(position);
    if (!Number.isFinite(numericPosition) || numericPosition < 0 || numericPosition > 24 * 60 * 60) throw new Error("Invalid playback position.");
    const state = roomState(socket.data.roomId);
    state.position = numericPosition;
    state.playing = action === "play";
    state.updatedAt = Date.now();
    io.to(socket.data.roomId).emit(`video:${action}`, playbackPayload(socket.data.roomId));
    await persistPlayback(socket.data.roomId, state);
    callback({ ok: true });
  } catch (error) { log("invalid playback event", { roomId: socket.data.roomId, reason: error.message }); callback({ ok: false, error: error.message }); }
}

setInterval(async () => {
  for (const [roomId] of rooms) {
    try { const party = await getParty(roomId); if (!party || party.status !== "active" || Date.now() - new Date(party.lastActivityAt).getTime() > ROOM_EXPIRY_MS) { rooms.delete(roomId); if (party?.status === "active") { await connectMongoose(); await WatchParty.updateOne({ roomId }, { $set: { status: "ended" } }); } } } catch { rooms.delete(roomId); }
  }
}, 5 * 60_000);
