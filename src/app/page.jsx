"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/navigation";

function Icon({ name, size = 20 }) {
  const paths = { home: <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" />, compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.4 4.1-4.2 2.4 2.4-4.2Z" /></>, bookmark: <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />, user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-4 3.4-6 8-6s7.2 2 8 6" /></>, search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>, bell: <><path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>, play: <path d="m9 6 9 6-9 6Z" fill="currentColor" stroke="none" />, chevron: <path d="m9 18 6-6-6-6" /> };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function MovieCard({ movie, saved, onToggle }) {
  return <article className="movie-card"><div className="poster-wrap"><Link className="poster" href={`/watch/${movie.id}`}><img src={movie.image} alt={`${movie.title} poster`} /><span className="score">{"\u2605"} {movie.rating || "8.3"}</span></Link><button className={saved ? "card-save saved-poster" : "card-save"} onClick={() => onToggle(movie.id)} aria-label={`${saved ? "Remove" : "Add"} ${movie.title} ${saved ? "from" : "to"} My List`}><Icon name="bookmark" size={15}/></button></div><h3>{movie.title}</h3><p>{movie.genre || movie.category}</p></article>;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [trending, setTrending] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/movies").then((response) => response.json()), fetch("/api/watchlist").then((response) => response.json())])
      .then(([movieData, listData]) => { setCatalog(movieData.movies); setTrending(movieData.trending); setWatchlist(listData.movies); })
      .catch(() => setMessage("We could not load the movie library. Please refresh and try again."))
      .finally(() => setLoading(false));
  }, []);

  const visibleMovies = useMemo(() => catalog.filter((movie) => movie.title.toLowerCase().includes(query.toLowerCase())), [catalog, query]);
  const savedIds = new Set(watchlist.map((movie) => movie.id));

  async function toggleWatchlist(movieId) {
    const isSaved = savedIds.has(movieId);
    setMessage("");
    try {
      const response = await fetch("/api/watchlist", { method: isSaved ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ movieId }) });
      if (!response.ok) throw new Error("Unable to update list");
      const data = await response.json();
      setWatchlist(data.movies);
      setMessage(isSaved ? "Removed from My List." : "Added to My List.");
    } catch { setMessage("Could not update your list. Please try again."); }
  }

  return <main className="app-shell">
    <Navigation/>
    <section className="content" id="top"><header className="topbar"><div className="mobile-brand"><span className="brand-mark">C</span></div><label className="search"><Icon name="search" size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search movies, shows, and more" /></label><div className="top-actions"><button className="icon-button" aria-label="Notifications"><Icon name="bell" /></button><span className="avatar">JM</span></div></header>
      <section className="hero"><div className="hero-copy"><span className="eyebrow">CINEMORA ORIGINAL</span><h1>Feel every<br/><i>moment.</i></h1><p>Stories that stay with you, worlds you never want to leave. Start watching something unforgettable.</p><div className="hero-actions"><Link className="watch-button" href="/discover"><Icon name="play" size={17}/> Watch now</Link><button className={savedIds.has("dune-two") ? "round-button saved" : "round-button"} aria-label="Save featured movie" onClick={() => toggleWatchlist("dune-two")}><Icon name="bookmark" size={18}/></button></div></div><div className="hero-meta"><span>2024</span><span>2h 46m</span><span>U/A 13+</span></div></section>
      {message && <p className="status-message" role="status">{message}</p>}
      <section className="section" id="browse"><div className="section-heading"><div><span className="section-kicker">CURATED FOR YOU</span><h2>Now showing</h2></div><span className="view-all">{visibleMovies.length} titles</span></div>{loading ? <p className="empty">Loading the library...</p> : <><div className="movie-grid">{visibleMovies.map((movie) => <MovieCard key={movie.id} movie={movie} saved={savedIds.has(movie.id)} onToggle={toggleWatchlist}/>)}</div>{visibleMovies.length === 0 && <p className="empty">No titles found. Try another search.</p>}</>}</section>
      <section className="section trending" id="watchlist"><div className="section-heading"><div><span className="section-kicker">YOUR PERSONAL COLLECTION</span><h2>My List</h2></div><span className="view-all">{watchlist.length} saved</span></div>{watchlist.length ? <div className="movie-grid watchlist-grid">{watchlist.map((movie) => <MovieCard key={movie.id} movie={movie} saved onToggle={toggleWatchlist}/>)}</div> : <p className="empty">Save a movie to build your personal watchlist.</p>}</section>
      <section className="section trending"><div className="section-heading"><div><span className="section-kicker">DON'T MISS OUT</span><h2>Trending this week</h2></div></div><div className="trending-grid">{trending.map((movie, index) => <article className="trend-card" key={movie.id}><img src={movie.image} alt=""/><div><span>0{index + 1}</span><h3>{movie.title}</h3><p>{movie.category}</p></div></article>)}</div></section>
    </section>
  </main>;
}
