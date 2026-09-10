"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { fetchWithAuth } from "@/lib/client-auth";
import { hasWatchedEnoughToRequirePremium, isWatchedToday } from "@/lib/premium";
import { createCryptoAccount, signInWithStoredCryptoIdentity } from "@/lib/crypto-client";

const GUEST_PROGRESS_KEY = "cinemora_guest_progress";

function readGuestProgress() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(GUEST_PROGRESS_KEY) || "[]"); } catch { return []; }
}

function writeGuestProgress(items) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(items));
}

function saveGuestProgress(movieId, progress) {
  const items = readGuestProgress();
  const entry = items.find((item) => item.movieId === movieId);
  if (entry) {
    entry.progress = Math.max(entry.progress, progress);
  } else {
    items.push({ movieId, progress, watchedAt: new Date().toISOString() });
  }
  writeGuestProgress(items);
  return items;
}

function getGuestWatchedCount() {
  return readGuestProgress().filter((item) => Number(item.progress || 0) > 0).length;
}

export default function WatchExperience({ movie, related }) {
  const videoRef = useRef(null);
  const lastSavedRef = useRef(0);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState("Overview");
  const [autoplay, setAutoplay] = useState(true);
  const [resumeAt, setResumeAt] = useState(0);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [cryptoSignedIn, setCryptoSignedIn] = useState(false);
  const [watchCount, setWatchCount] = useState(0);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [sessionIdInput, setSessionIdInput] = useState("");
  const [hasPremium, setHasPremium] = useState(false);
  const [isAccessReady, setIsAccessReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsAuthReady(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    async function loadState() {
      try {
        setWatchCount(getGuestWatchedCount());
        const localProgress = readGuestProgress().find((entry) => entry.movieId === movie.id);
        let currentResume = localProgress?.progress || 0;
        let currentAutoplay = true;

        if (firebaseUser) {
          await fetch("/api/auth/google", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: firebaseUser.email, name: firebaseUser.displayName, photoURL: firebaseUser.photoURL }),
          });
        }

        const profileCheck = await fetchWithAuth("/api/profile");
        if (profileCheck.ok) {
          setCryptoSignedIn(true);
          const profileData = await profileCheck.clone().json().catch(() => ({}));
          setHasPremium(Boolean(profileData.profile?.premium));
        }

        if (firebaseUser || profileCheck.ok) {
          const [watchlistResponse, historyResponse, profileResponse] = await Promise.allSettled([
            fetchWithAuth("/api/watchlist"),
            fetchWithAuth("/api/history"),
            Promise.resolve(profileCheck),
          ]);

        if (watchlistResponse.status === "fulfilled" && watchlistResponse.value.ok) {
          const list = await watchlistResponse.value.json();
          setSaved(list.movieIds.includes(movie.id));
        }

        if (profileResponse.status === "fulfilled" && profileResponse.value.ok) {
          const profile = await profileResponse.value.json();
          currentAutoplay = Boolean(profile.profile?.autoplay);
        }

        if (historyResponse.status === "fulfilled" && historyResponse.value.ok) {
          const history = await historyResponse.value.json();
          const entry = history.items?.find((item) => item.movieId === movie.id);
          currentResume = entry?.progress ?? currentResume;
          setWatchCount((history.items || []).filter((item) => Number(item.progress || 0) > 0 && isWatchedToday(item.watchedAt)).length);
        }
        }

        setResumeAt(currentResume);
        setAutoplay(currentAutoplay);
      } finally {
        setIsAccessReady(true);
      }
    }

    if (isAuthReady) loadState();
  }, [movie.id, firebaseUser, isAuthReady]);

  const isSignedIn = Boolean(firebaseUser || cryptoSignedIn);
  const isPremiumRequired = isAccessReady && hasWatchedEnoughToRequirePremium(watchCount) && !hasPremium;

  const saveProgress = useCallback((progress) => {
    if (isSignedIn) {
      return fetchWithAuth("/api/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ movieId: movie.id, progress }) }).catch(() => {});
    }
    const items = saveGuestProgress(movie.id, progress);
    setWatchCount(items.filter((item) => Number(item.progress || 0) > 0).length);
    return Promise.resolve();
  }, [isSignedIn, movie.id]);

  function onTimeUpdate() {
    const video = videoRef.current;
    if (!video?.duration) return;
    const progress = Math.round((video.currentTime / video.duration) * 100);
    if (progress - lastSavedRef.current >= 10) {
      lastSavedRef.current = progress;
      saveProgress(progress);
    }
  }

  async function handleSignIn() {
    try {
      await signInWithPopup(auth, googleProvider);
      setNotice("Signed in with Google. You can continue watching.");
    } catch (error) {
      setNotice(error.message || "Google sign-in failed.");
    }
  }

  async function handleWalletSignIn() {
    try {
      await createCryptoAccount();
      setCryptoSignedIn(true);
      setNotice("Account created with a local public-private key pair. You can continue watching.");
    } catch (error) {
      try {
        await signInWithStoredCryptoIdentity();
        setCryptoSignedIn(true);
        setNotice("Signed in with public key. You can continue watching.");
      } catch {
        setNotice(error.message || "Public-key sign-in failed.");
      }
    }
  }

  async function handleSessionIdSignIn() {
    try {
      const sessionId = sessionIdInput.trim();
      if (!sessionId) {
        setNotice("Enter your Session ID to sign in.");
        return;
      }

      await signInWithStoredCryptoIdentity(sessionId);
      setCryptoSignedIn(true);
      setNotice("Signed in with Session ID. You can continue watching.");
    } catch (error) {
      setNotice(error.message || "Session ID sign-in failed.");
    }
  }

  async function toggleList() {
    if (!isSignedIn) {
      setNotice("Sign in to save this movie to your list.");
      return;
    }

    const response = await fetchWithAuth("/api/watchlist", { method: saved ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ movieId: movie.id }) });
    if (response.ok) {
      setSaved(!saved);
      setNotice(saved ? "Removed from My List" : "Added to My List");
    } else {
      setNotice("Unable to update My List");
    }
  }

  const details = activeTab === "Overview"
    ? movie.description || "A journey beyond the familiar begins when one choice opens a world of danger, wonder, and possibility."
    : activeTab === "Details"
      ? `${movie.genre || movie.category || "Drama"} - ${movie.year || "2024"} - ${movie.duration || "Runtime not available"}`
      : "Reviews will be available soon.";
  if (!isAccessReady) {
    return <section className="watch-experience"><div className="watch-lock"><p>Checking your viewing access...</p></div></section>;
  }
  if (isPremiumRequired) {
    return <section className="watch-experience"><div className="watch-lock"><h1>Premium access required</h1><p>{isSignedIn ? "Your free viewing limit has been reached. Activate Premium to continue watching." : "Sign in and activate Premium after watching one movie to continue."}</p>{isSignedIn ? <Link className="watch-button" href="/premium">Activate Premium</Link> : <><div style={{ display: "flex", gap: "12px", margin: "20px 0", flexWrap: "wrap" }}><button className="watch-button google-login" type="button" onClick={handleSignIn}>Sign in with Google</button><button className="watch-button" type="button" onClick={handleWalletSignIn}>Create Account</button></div><div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", margin: "10px 0 0" }}><input aria-label="Session ID" value={sessionIdInput} onChange={(event) => setSessionIdInput(event.target.value)} placeholder="Enter Session ID" style={{ flex: "1 1 220px", minWidth: "220px", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(15,15,18,0.8)", color: "#fff" }} /><button className="watch-button" type="button" onClick={handleSessionIdSignIn}>Log in with Session ID</button></div></>}{notice && <p className="watch-notice" role="status">{notice}</p>}</div></section>;
  }
  return <section className="watch-experience"><div className="watch-player" style={{ "--backdrop": `url(${movie.image})` }}>{movie.videoUrl ? <video ref={videoRef} className="movie-video" poster={movie.image} controls playsInline autoPlay={autoplay} onLoadedMetadata={(event) => { if (resumeAt > 0 && resumeAt < 95) event.currentTarget.currentTime = event.currentTarget.duration * resumeAt / 100; }} onTimeUpdate={onTimeUpdate} onEnded={() => saveProgress(100)}><source src={movie.videoUrl} type="video/mp4" />Your browser does not support HTML video.</video> : <div className="video-unavailable"><span>Play</span><b>Trailer coming soon</b><small>This title does not have a video source yet.</small></div>}<div className="player-top"><Link href="/" className="player-back">Back <span>to browse</span></Link><div className="player-badges"><span>{movie.rating ? `Rating ${movie.rating}` : "New"}</span><span>{movie.year || "2024"}</span></div></div></div><div className="watch-details"><div className="watch-main"><div className="title-row"><div><span className="eyebrow">CINEMORA ORIGINAL</span><h1>{movie.title}</h1></div><button className={saved ? "add-list saved-list" : "add-list"} onClick={toggleList}>{saved ? "In My List" : "Add to My List"}</button></div>{resumeAt > 0 && resumeAt < 95 && <p className="watch-notice" role="status">Resuming from {resumeAt}% watched.</p>}{notice && <p className="watch-notice" role="status">{notice}</p>}<div className="watch-facts"><span>{movie.year || "2024"}</span><span>{movie.genre || movie.category}</span><span className="rating">Rating {movie.rating || "N/A"}</span><span>{movie.duration || "Runtime TBA"}</span></div><div className="watch-tabs">{["Overview", "Details", "Reviews"].map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div><p className="synopsis">{details}</p></div><aside className="up-next"><div className="up-next-heading"><span>UP NEXT</span><button onClickkkk={() => setAutoplay(!autoplay)} aria-pressed={autoplay}>Autoplay <i className={autoplay ? "on" : ""}/></button></div>{related.slice(0, 2).map((item, index) => <Link className="next-item" href={`/watch/${item.id}`} key={item.id}><img src={item.image} alt=""/><div><small>{index ? "Because you watched this" : "Recommended for you"}</small><h3>{item.title}</h3><p>{item.genre || item.category}</p></div><b>Next</b></Link>)}</aside></div></section>;
}
