"use client";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { fetchWithAuth, authHeaders } from "@/lib/client-auth";
import { auth } from "@/lib/firebase";
import WatchPartyChat from "./WatchPartyChat";
import WatchPartyReactions from "./WatchPartyReactions";
import Participants from "./Participants";
import InviteButton from "./InviteButton";

function socketUrl() { return process.env.NEXT_PUBLIC_APP_URL || window.location.origin; }

export default function WatchParty({ roomId }) {
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const syncTimerRef = useRef(null);
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [floating, setFloating] = useState([]);
  const [userId, setUserId] = useState("");
  const [notice, setNotice] = useState("");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let alive = true;
    async function start() {
      const response = await fetchWithAuth(`/api/watch-party/${roomId}`);
      const data = await response.json();
      if (!response.ok) { if (alive) setNotice(data.error || "This Watch Party is unavailable."); return; }
      if (!alive) return;
      setRoom(data.room);
      const joinResponse = await fetchWithAuth(`/api/watch-party/${roomId}/join`, { method: "POST" });
      if (!joinResponse.ok) { if (alive) setNotice((await joinResponse.json()).error || "Could not join this room."); return; }
      const currentHeaders = await authHeaders();
      setUserId(auth.currentUser?.uid || "");
      const messageResponse = await fetchWithAuth(`/api/watch-party/${roomId}/messages`);
      if (messageResponse.ok) setMessages((await messageResponse.json()).messages || []);
      const token = currentHeaders.Authorization?.replace(/^Bearer /i, "");
      const socket = io(socketUrl(), { auth: { token }, withCredentials: true });
      socketRef.current = socket;
      socket.on("connect", () => { setConnected(true); socket.emit("room:join", { roomId }, (result) => { if (!result?.ok) setNotice(result?.error || "Could not join the live room."); }); });
      socket.on("disconnect", () => setConnected(false));
      socket.on("chat:message", (message) => setMessages((current) => [...current.slice(-99), message]));
      socket.on("user:join", (participant) => setRoom((current) => current ? { ...current, participants: current.participants.some((item) => item.userId === participant.userId) ? current.participants : [...current.participants, { ...participant, joinedAt: new Date().toISOString() }] } : current));
      socket.on("user:leave", ({ userId: leavingId }) => setRoom((current) => current ? { ...current, participants: current.participants.filter((item) => item.userId !== leavingId) } : current));
      socket.on("room:host-transferred", ({ username }) => setNotice(`${username} is now the host.`));
      socket.on("reaction:send", (reaction) => { const item = { ...reaction, id: `${Date.now()}-${Math.random()}` }; setFloating((current) => [...current.slice(-5), item]); setTimeout(() => setFloating((current) => current.filter((entry) => entry.id !== item.id)), 2400); });
      const applySync = (payload, hard = false) => { const video = videoRef.current; if (!video || !Number.isFinite(payload.position)) return; const drift = payload.position - video.currentTime; if (hard || Math.abs(drift) > 2) video.currentTime = payload.position; else if (Math.abs(drift) > 0.5) video.currentTime += drift * 0.25; if (payload.playing && video.paused) video.play().catch(() => {}); if (!payload.playing && !video.paused) video.pause(); };
      ["video:play", "video:pause", "video:seek", "video:sync"].forEach((event) => socket.on(event, (payload) => applySync(payload, event === "video:seek" || event === "video:sync")));
      syncTimerRef.current = setInterval(() => socket.emit("video:sync"), 3000);
    }
    start().catch(() => setNotice("Unable to connect to this Watch Party."));
    return () => { alive = false; clearInterval(syncTimerRef.current); socketRef.current?.emit("room:leave"); socketRef.current?.disconnect(); };
  }, [roomId]);

  function emitPlayback(event) { const video = videoRef.current; const socket = socketRef.current; if (video && socket) socket.emit(event, { position: video.currentTime }, (result) => { if (!result?.ok) setNotice(result?.error || "Playback control unavailable."); }); }
  async function sendChat(message) {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit("chat:message", { message }, async (result) => {
        if (result?.ok) return;
        const response = await fetchWithAuth(`/api/watch-party/${roomId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
        if (!response.ok) setNotice((await response.json()).error || result?.error || "Message could not be sent.");
      });
      return;
    }
    const response = await fetchWithAuth(`/api/watch-party/${roomId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
    if (!response.ok) setNotice((await response.json()).error || "Message could not be sent.");
  }
  function sendReaction(reaction) { socketRef.current?.emit("reaction:send", { reaction }); }
  async function endRoom() { const response = await fetchWithAuth(`/api/watch-party/${roomId}/end`, { method: "POST" }); if (response.ok) setNotice("This Watch Party has ended."); else setNotice((await response.json()).error || "Only the host can end this room."); }

  if (notice && !room) return <main className="party-state"><h1>{notice}</h1><a href="/watch-parties">Browse live rooms</a></main>;
  if (!room) return <main className="party-state"><p>Loading Watch Party...</p></main>;
  const isHost = room.hostId === userId;
  return <main className="watch-party-page"><header className="party-header"><div><span className="eyebrow">{room.privacy === "private" ? "PRIVATE ROOM" : "LIVE WATCH PARTY"}</span><h1>{room.name}</h1><p>{room.movie?.title || "Movie"} · {connected ? "Connected" : "Reconnecting..."}</p></div><InviteButton roomId={roomId}/></header><div className="party-layout"><section className="party-video-wrap"><video ref={videoRef} className="party-video" poster={room.movie?.image} controls playsInline onPlay={() => emitPlayback("video:play")} onPause={() => emitPlayback("video:pause")} onSeeked={() => emitPlayback("video:seek")}><source src={room.movie?.videoUrl} type="video/mp4"/></video><div className="party-video-title"><strong>{room.movie?.title}</strong><span>{room.movie?.genre || room.movie?.category || "Now watching together"}</span></div></section><aside className="party-sidebar"><WatchPartyChat messages={messages} onSend={sendChat}/><WatchPartyReactions onReact={sendReaction} floating={floating}/></aside></div><Participants participants={room.participants} userId={userId}/><footer className="party-footer"><span>{room.participantCount || room.participants.length} watching</span><div>{isHost && <button className="party-action danger" type="button" onClick={endRoom}>End room</button>}<button className="party-action" type="button" onClick={() => navigator.share?.({ title: room.name, url: window.location.href })}>Share</button></div></footer></main>;
}
