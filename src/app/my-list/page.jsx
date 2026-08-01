"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/navigation";

export default function MyListPage() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/watchlist").then((response) => response.json()).then((data) => setMovies(data.movies)).finally(() => setLoading(false)); }, []);
  async function remove(movieId) { const response = await fetch("/api/watchlist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ movieId }) }); const data = await response.json(); setMovies(data.movies); }
  return <main className="app-shell"><Navigation/><section className="content page-content"><span className="eyebrow">YOUR PERSONAL COLLECTION</span><h1 className="page-title">My <i>List.</i></h1>{loading ? <p className="empty">Loading your list...</p> : movies.length ? <div className="discover-grid">{movies.map((movie) => <article className="movie-card" key={movie.id}><div className="poster-wrap"><Link className="poster" href={`/watch/${movie.id}`}><img src={movie.image} alt={`${movie.title} poster`} /><span className="score">★ {movie.rating || "8.3"}</span></Link><button className="card-save saved-poster" onClick={() => remove(movie.id)} aria-label={`Remove ${movie.title} from My List`}>−</button></div><h3>{movie.title}</h3><p>{movie.genre || movie.category}</p></article>)}</div> : <div className="empty-state"><h2>Your list is empty.</h2><p>Find films worth keeping close and add them here.</p><Link className="watch-button" href="/discover">Explore movies</Link></div>}</section></main>;
}
