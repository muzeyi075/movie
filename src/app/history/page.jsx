"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/navigation";
import { fetchWithAuth } from "@/lib/client-auth";

export default function HistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const response = await fetchWithAuth("/api/history");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load your history.");
      setItems(data.items || []);
    } catch (error) {
      setMessage(error.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function clear() {
    if (!window.confirm("Clear your watch history?")) return;
    const response = await fetchWithAuth("/api/history", { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      return setMessage(data.error || "Could not clear your history.");
    }
    setItems([]);
  }

  return <main className="app-shell"><Navigation/><section className="content page-content"><span className="eyebrow">KEEP WATCHING</span><div className="history-heading"><h1 className="page-title">Watch <i>history.</i></h1>{items.length > 0 && <button className="text-button" onClick={clear}>Clear history</button>}</div>{message && <p className="status-message" role="status">{message}</p>}{loading ? <p className="empty">Loading your history…</p> : items.length ? <div className="history-grid">{items.map(({ movie, progress }) => <Link className="history-item" href={`/watch/${movie.id}`} key={movie.id}><img src={movie.image} alt={`${movie.title} poster`}/><div><h2>{movie.title}</h2><p>{movie.genre || movie.category}</p><span><i style={{ width: `${progress}%` }}/> {progress}% watched</span></div></Link>)}</div> : <div className="empty-state"><h2>No watch history yet.</h2><p>Start a title and it will appear here so you can easily return to it.</p><Link className="watch-button" href="/">Browse movies</Link></div>}</section></main>;
}
