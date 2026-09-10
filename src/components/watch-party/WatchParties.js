"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/client-auth";

export default function WatchParties({ movies }) {
  const [rooms, setRooms] = useState([]);
  const [movieId, setMovieId] = useState(movies[0]?.id || "");
  const [name, setName] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [notice, setNotice] = useState("");
  useEffect(() => { fetchWithAuth("/api/watch-party").then(async (response) => { if (response.ok) setRooms((await response.json()).rooms || []); }); }, []);
  async function create(event) { event.preventDefault(); const response = await fetchWithAuth("/api/watch-party", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ movieId, name, privacy }) }); const data = await response.json(); if (!response.ok) return setNotice(data.error || "Could not create a room."); window.location.href = `/watch-party/${data.room.roomId}`; }
  return <main className="party-discovery"><header className="party-header discovery-header"><div><span className="eyebrow">CINEMORA SOCIAL</span><h1>Watch together.</h1><p>Make a room, press play, and keep the conversation in the same place.</p></div></header><section className="party-create"><div><span className="eyebrow">START A ROOM</span><h2>Choose the night.</h2></div><form onSubmit={create}><select value={movieId} onChange={(event) => setMovieId(event.target.value)} aria-label="Movie">{movies.map((movie) => <option key={movie.id} value={movie.id}>{movie.title}</option>)}</select><input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="Room name (optional)"/><div className="privacy-toggle"><button type="button" className={privacy === "public" ? "active" : ""} onClick={() => setPrivacy("public")}>Public</button><button type="button" className={privacy === "private" ? "active" : ""} onClick={() => setPrivacy("private")}>Private</button></div><button className="party-action primary" type="submit">Create Watch Party</button>{notice && <p className="party-notice" role="status">{notice}</p>}</form></section><section className="party-room-list"><div className="party-section-heading"><div><span className="eyebrow">LIVE NOW</span><h2>Public watch parties</h2></div><small>{rooms.length} rooms</small></div>{rooms.length ? <div className="party-room-grid">{rooms.map((room) => <article className="party-room-card" key={room.roomId}><div className="party-room-image" style={{ backgroundImage: `url(${room.movie?.image || ""})` }}/><div className="party-room-copy"><span className="party-live">LIVE</span><h3>{room.name}</h3><p>{room.movie?.title || "Movie"}</p><small>{room.participantCount} watching</small><Link href={`/watch-party/${room.roomId}`}>Join room</Link></div></article>)}</div> : <p className="party-empty">No public rooms are live yet. Start the first one.</p>}</section></main>;
}
