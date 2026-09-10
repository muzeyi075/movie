"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import Navigation from "@/components/navigation";
import { auth, googleProvider } from "@/lib/firebase";
import { fetchWithAuth } from "@/lib/client-auth";
import { createCryptoAccount, signInWithStoredCryptoIdentity } from "@/lib/crypto-client";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(undefined);
  const [authReady, setAuthReady] = useState(false);

  async function loadWatchlist() {
    try {
      const response = await fetchWithAuth("/api/watchlist");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load your list.");
      setWatchlist(data.movies || []);
      return data.movies || [];
    } catch (error) {
      setWatchlist([]);
      return [];
    }
  }

  async function loadProfile() {
    try {
      const response = await fetchWithAuth("/api/profile");
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Could not load your profile.");
        if (response.status === 401) setNeedsSignIn(true);
        return null;
      }
      setNeedsSignIn(false);
      setProfile(data.profile);
      return data.profile;
    } catch {
      setMessage("Could not load your profile.");
      return null;
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authReady) return;

    async function hydrate() {
      const loaded = await loadProfile();
      if (loaded) {
        await loadWatchlist();
        return;
      }
      if (!firebaseUser) {
        setNeedsSignIn(true);
        setProfile(null);
        setWatchlist([]);
        setMessage("Please sign in to view your profile.");
      }
    }

    hydrate();
  }, [authReady, firebaseUser]);

  useEffect(() => {
    const profileHeader = document.querySelector(".profile-welcome");
    if (!profileHeader || !profile) return undefined;
    const existing = profileHeader.querySelector(".premium-status-card");
    existing?.remove();
    const card = document.createElement("div");
    card.className = "premium-status-card";
    const expiresAt = profile.premiumExpiresAt ? new Date(profile.premiumExpiresAt) : null;
    const remaining = profile.premium && profile.premiumPlan === "lifetime"
      ? "Lifetime access"
      : profile.premium && expiresAt && expiresAt.getTime() > Date.now()
        ? profile.premiumPlan === "1-day"
          ? `${Math.ceil((expiresAt.getTime() - Date.now()) / 3_600_000)} hour(s) remaining`
          : `${Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000)} day(s) remaining`
        : "No active Premium plan";
    card.innerHTML = `<div><span class="eyebrow">PREMIUM ACCESS</span><h2>${profile.premium ? `${profile.premiumPlan || "Premium"} plan` : "Premium is not active"}</h2><p>${remaining}${expiresAt && profile.premium ? ` · Expires ${expiresAt.toLocaleDateString()}` : ""}</p></div><a class="watch-button" href="/premium">${profile.premium ? "Manage Premium" : "Choose a plan"}</a>`;
    profileHeader.after(card);
    let cancelled = false;
    fetchWithAuth("/api/profile/subscriptions").then((response) => response.ok ? response.json() : null).then((data) => {
      if (cancelled || !data?.subscriptions?.length) return;
      const history = document.createElement("div");
      history.className = "premium-history-list";
      const title = document.createElement("strong");
      title.textContent = "Subscription history";
      history.append(title);
      data.subscriptions.forEach((subscription) => {
        const item = document.createElement("span");
        const expires = subscription.lifetime ? "Never" : subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleString() : "-";
        item.textContent = `${subscription.plan} · ${subscription.revokedAt ? "Revoked" : `Expires ${expires}`}`;
        history.append(item);
      });
      card.append(history);
    }).catch(() => {});
    return () => { cancelled = true; card.remove(); };
  }, [profile]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const response = await fetchWithAuth("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setMessage(data.error || "Could not save your settings.");
      if (response.status === 401) setNeedsSignIn(true);
      return;
    }
    setProfile(data.profile);
    setMessage("Settings saved.");
  }

  async function signInWithGoogle() {
    setSaving(true);
    setMessage("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const loginResponse = await fetchWithAuth("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: user.displayName || profile?.name || "", email: user.email || profile?.email || "" }) });
      const data = await loginResponse.json();
      if (!loginResponse.ok) throw new Error(data.error || "Could not sign in.");
      setNeedsSignIn(false);
      setMessage("Signed in with Google.");
      await loadProfile();
    } catch (error) {
      setMessage(error.message || "Google sign-in failed.");
    } finally {
      setSaving(false);
    }
  }

  async function signOutUser() {
    setSaving(true);
    setMessage("");
    try {
      await signOut(auth);
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      setProfile(null);
      setWatchlist([]);
      setNeedsSignIn(true);
      setMessage("Signed out successfully.");
    } catch (error) {
      setMessage(error.message || "Could not sign out.");
    } finally {
      setSaving(false);
    }
  }

  async function createAccountWithCrypto() {
    setSaving(true);
    setMessage("");
    try {
      const identity = await createCryptoAccount();
      setNeedsSignIn(false);
      setMessage(`Account created. Your Session ID is ${identity.sessionId}`);
      await loadProfile();
      await loadWatchlist();
    } catch (error) {
      setMessage(error.message || "Could not create a cryptographic account.");
    } finally {
      setSaving(false);
    }
  }

  async function removeFromList(movieId) {
    try {
      const response = await fetchWithAuth("/api/watchlist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ movieId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not remove that movie.");
      setWatchlist(data.movies || []);
    } catch (error) {
      setMessage(error.message || "Could not remove that movie.");
    }
  }

  async function signInWithCrypto() {
    setSaving(true);
    setMessage("");
    try {
      await signInWithStoredCryptoIdentity();
      setNeedsSignIn(false);
      setMessage("Signed in with cryptographic key.");
      await loadProfile();
    } catch (error) {
      setMessage(error.message || "Wallet sign-in failed.");
    } finally {
      setSaving(false);
    }
  }

  if (!authReady) {
    return <main className="app-shell"><Navigation/><section className="content page-content"><span className="eyebrow">YOUR ACCOUNT</span><h1 className="page-title">Your viewing <i>preferences.</i></h1><p className="empty">Checking sign-in status…</p></section></main>;
  }

  if (!profile) {
    return <main className="app-shell"><Navigation/><section className="content page-content"><span className="eyebrow">YOUR ACCOUNT</span><h1 className="page-title">Your viewing <i>preferences.</i></h1>{needsSignIn ? <div className="empty-state"><h2>Sign in to view your profile.</h2><p>Create an anonymous account with a local public-private key pair, or sign in with Google.</p><div style={{ display: "flex", gap: "12px", margin: "20px 0", flexWrap: "wrap" }}><button className="watch-button google-login" type="button" onClick={signInWithGoogle} disabled={saving}>{saving ? "Signing in…" : "Sign in with Google"}</button><button className="watch-button" type="button" onClick={createAccountWithCrypto} disabled={saving}>{saving ? "Creating…" : "Create Account"}</button><button className="watch-button" type="button" onClick={signInWithCrypto} disabled={saving}>{saving ? "Signing in…" : "Sign in with Public Key"}</button></div>{message && <p className="admin-message" role="status">{message}</p>}</div> : <p className="empty">Loading your profile…</p>}{message && !needsSignIn && <p className="admin-message" role="status">{message}</p>}</section></main>;
  }

  const initials = String(profile.name || "Cinemora User").split(" ").map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "CU";
  const premiumExpiry = profile.premiumExpiresAt ? new Date(profile.premiumExpiresAt) : null;
  const premiumRemaining = profile.premium && premiumExpiry && premiumExpiry.getTime() > Date.now()
    ? `${Math.ceil((premiumExpiry.getTime() - Date.now()) / 86_400_000)} day(s) remaining`
    : "No active Premium plan";

  return <main className="app-shell"><Navigation/><section className="content page-content"><span className="eyebrow">YOUR ACCOUNT</span><h1 className="page-title">Your viewing <i>preferences.</i></h1><div className="profile-welcome"><div className="profile-card"><span className="profile-avatar">{initials}</span><div><h2>{profile.name}</h2><p>{profile.email || "Anonymous public-key account"}</p>{profile.sessionId ? <p><small>Session ID</small><br /><code style={{ wordBreak: "break-all" }}>{profile.sessionId}</code></p> : null}</div></div><div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}><button className="watch-button google-login" type="button" onClick={signInWithGoogle} disabled={saving}>Sign in with Google</button><button className="watch-button" type="button" onClick={signOutUser} disabled={saving} style={{ background: "#2a2a2d", color: "#fff" }}>Sign out</button></div></div><div className="settings-card my-list-card"><div className="card-header-row"><h2>My List</h2>{watchlist.length > 0 && <span>{watchlist.length} saved</span>}</div>{watchlist.length ? <div className="my-list-grid">{watchlist.map((movie) => <article className="movie-card" key={movie.id}><div className="poster-wrap"><Link className="poster" href={`/watch/${movie.id}`}><img src={movie.image} alt={`${movie.title} poster`} /><span className="score">★ {movie.rating || "8.3"}</span></Link><button className="card-save saved-poster" onClick={() => removeFromList(movie.id)} aria-label={`Remove ${movie.title} from My List`}>−</button></div><h3>{movie.title}</h3><p>{movie.genre || movie.category}</p></article>)}</div> : <div className="empty-state"><h2>Your list is empty.</h2><p>Find films worth keeping close and add them here.</p><Link className="watch-button" href="/discover">Explore movies</Link></div>}</div><form className="settings-card settings-form" onSubmit={submit}><h2>Playback settings</h2><p>Choose how Cinemora should play titles on this device.</p><label>Name<input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })}/></label><label>Email<input type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })}/></label><label>Preferred quality<select value={profile.quality} onChange={(event) => setProfile({ ...profile, quality: event.target.value })}><option>Auto</option><option>1080p</option><option>720p</option></select></label><label className="check-row"><input type="checkbox" checked={profile.autoplay} onChange={(event) => setProfile({ ...profile, autoplay: event.target.checked })}/> Autoplay next title</label><label className="check-row"><input type="checkbox" checked={profile.subtitles} onChange={(event) => setProfile({ ...profile, subtitles: event.target.checked })}/> Enable subtitles by default</label><button className="watch-button" disabled={saving}>{saving ? "Saving…" : "Save settings"}</button>{message && <p className="admin-message" role="status">{message}</p>}</form></section></main>;
}
