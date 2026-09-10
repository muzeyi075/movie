"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/navigation";
import { fetchWithAuth } from "@/lib/client-auth";

export default function MyListPage() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchWithAuth("/api/watchlist")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load your list.");
        setMovies(data.movies || []);
      })
      .catch((error) => {
        setMessage(error.message);
        setMovies([]);
      })
      .finally(() => setLoading(false));
  }, []);

  async function remove(movieId) {
    const response = await fetchWithAuth("/api/watchlist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ movieId }) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "Could not remove that movie.");
    setMovies(data.movies || []);
  }

  return <main className="app-shell"><Navigation/><section className="content page-content"><span className="eyebrow">YOUR PERSONAL COLLECTION</span><h1 className="page-title">My <i>List.</i></h1>{message && <p className="status-message" role="status">{message}</p>}{loading ? <p className="empty">Loading your list...</p> : movies.length ? <div className="discover-grid">{movies.map((movie) => <article className="movie-card" key={movie.id}><div className="poster-wrap"><Link className="poster" href={`/watch/${movie.id}`}><img src={movie.image} alt={`${movie.title} poster`} /><span className="score">★ {movie.rating || "8.3"}</span></Link><button className="card-save saved-poster" onClick={() => remove(movie.id)} aria-label={`Remove ${movie.title} from My List`}>−</button></div><h3>{movie.title}</h3><p>{movie.genre || movie.category}</p></article>)}</div> : <div className="empty-state"><h2>Your list is empty.</h2><p>Find films worth keeping close and add them here.</p><Link className="watch-button" href="/discover">Explore movies</Link></div>}</section></main>;
}
