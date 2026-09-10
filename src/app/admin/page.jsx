"use client";

import { useEffect, useState } from "react";
import Navigation from "@/components/navigation";

const blankMovie = {
  title: "",
  year: "2024",
  rating: "8.0",
  genre: "",
  categories: "",
  image: "",
  videoUrl: "",
  description: "",
  duration: "",
  price: 0
};

const defaultPremiumConfig = {
  phoneNumber: "0785552454",
  amount: 5000,
  planPrices: {
    "1-day": 500,
    "1-week": 2000,
    "1-month": 1000,
    "3-months": 3000,
    lifetime: 1000,
  },
  tokenExpiryMinutes: 15,
  requiresWatchedMovies: 1
};

const planOptions = [
  { value: "1-day", label: "Plan 1", shortLabel: "1 Day" },
  { value: "1-week", label: "Plan 2", shortLabel: "1 Week" },
  { value: "1-month", label: "Plan 3", shortLabel: "1 Month" },
  { value: "3-months", label: "Plan 4", shortLabel: "3 Months" },
  { value: "lifetime", label: "Plan 5", shortLabel: "Lifetime" }
];

export default function AdminPage() {
  const [movies, setMovies] = useState([]);
  const [payments, setPayments] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [walletSearch, setWalletSearch] = useState("");
  const [form, setForm] = useState(blankMovie);
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const [premiumConfig, setPremiumConfig] = useState(defaultPremiumConfig);
  const [generatedPin, setGeneratedPin] = useState("");
  const [pinPlan, setPinPlan] = useState("1-month");
  const [generatedPinPlan, setGeneratedPinPlan] = useState("");
  const [activeView, setActiveView] = useState("movies");

  async function loadMovies() {
    try {
      const response = await fetch("/api/admin/movies");
      const data = await response.json();
      setMovies(data.movies || []);
    } catch {
      setMessage("Could not load the catalog.");
    }
  }

  async function loadPremiumSettings() {
    try {
      const response = await fetch("/api/admin/premium");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load premium settings.");
      setPremiumConfig({ ...defaultPremiumConfig, ...data.config });
    } catch (error) {
      setMessage(error.message || "Could not load premium settings.");
    }
  }

  async function loadPayments() {
    try {
      const response = await fetch("/api/admin/payments");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load payments.");
      setPayments(data.payments || []);
    } catch (error) {
      setMessage(error.message || "Could not load payment queue.");
    }
  }

  async function loadWallets(search = walletSearch) {
    try {
      const response = await fetch(`/api/admin/wallets?q=${encodeURIComponent(search)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load wallets.");
      setWallets(data.wallets || []);
    } catch (error) {
      setMessage(error.message || "Could not load wallets.");
    }
  }

  async function loadUsers(search = userSearch) {
    try {
      const response = await fetch(`/api/admin/users?q=${encodeURIComponent(search)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load signed-in users.");
      setUsers(data.users || []);
    } catch (error) {
      setMessage(error.message || "Could not load signed-in users.");
    }
  }

  async function assignUserPlan(userId, plan) {
    try {
      const response = await fetch("/api/admin/subscription", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, plan }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not assign Premium plan.");
      setMessage("Premium plan assigned.");
      await loadUsers();
    } catch (error) { setMessage(error.message || "Could not assign Premium plan."); }
  }

  async function revokeUserPlan(userId) {
    try {
      const response = await fetch(`/api/admin/subscription?userId=${encodeURIComponent(userId)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not revoke Premium plan.");
      setMessage("Premium plan revoked.");
      await loadUsers();
    } catch (error) { setMessage(error.message || "Could not revoke Premium plan."); }
  }

  useEffect(() => {
    async function checkAdminStatus() {
      try {
        const response = await fetch("/api/admin/status");
        if (response.ok) {
          setIsAuthorized(true);
          await Promise.all([loadMovies(), loadPremiumSettings(), loadPayments(), loadWallets(), loadUsers()]);
        }
      } catch {
        // ignore for unauthorized state
      }
    }
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    Promise.all([loadMovies(), loadPremiumSettings(), loadPayments(), loadWallets(), loadUsers()]);
  }, [isAuthorized]);

  function change(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setAccessMessage("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Incorrect password.");
      setIsAuthorized(true);
      setPassword("");
      await Promise.all([loadMovies(), loadPremiumSettings(), loadPayments(), loadWallets(), loadUsers()]);
    } catch (error) {
      setAccessMessage(error.message || "Incorrect password. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function upload(event, field) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(field);
    setMessage("");
    try {
      const signed = await fetch("/api/admin/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size })
      });
      const uploadData = await signed.json();
      if (!signed.ok) throw new Error(uploadData.error || "Upload failed.");

      const uploaded = await fetch(uploadData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file
      });
      if (!uploaded.ok) throw new Error("Backblaze rejected the upload.");

      setForm((current) => ({ ...current, [field]: uploadData.publicUrl }));
      setMessage(`${field === "image" ? "Poster" : "Video"} uploaded.`);
    } catch (error) {
      setMessage(error.message || "Upload failed.");
    } finally {
      setUploading("");
      event.target.value = "";
    }
  }

  function edit(movie) {
    setEditingId(movie.id);
    setForm({
      title: movie.title,
      year: movie.year,
      rating: movie.rating || "",
      genre: movie.genre || movie.category || "",
      categories: (movie.categories || []).join(", "),
      image: movie.image || "",
      videoUrl: movie.videoUrl || "",
      description: movie.description || "",
      duration: movie.duration || "",
      price: movie.price || 0
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/movies", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, id: editingId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save movie.");
      setMessage(editingId ? "Movie updated." : "Movie created.");
      setForm(blankMovie);
      setEditingId("");
      await loadMovies();
    } catch (error) {
      setMessage(error.message || "Could not save movie.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this movie from the catalog?")) return;
    const response = await fetch("/api/admin/movies", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    if (!response.ok) {
      setMessage("Could not delete movie.");
      return;
    }
    setMessage("Movie deleted.");
    await loadMovies();
  }

  async function savePremiumSettings(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/premium", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(premiumConfig)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save premium settings.");
      setPremiumConfig({ ...defaultPremiumConfig, ...data.config });
      setMessage("Premium payment settings saved.");
    } catch (error) {
      setMessage(error.message || "Could not save premium settings.");
    } finally {
      setSaving(false);
    }
  }

  async function approvePayment(paymentId, plan) {
    try {
      const response = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, plan })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Approval failed.");
      setMessage("Payment approved and premium activated.");
      await loadPayments();
    } catch (error) {
      setMessage(error.message || "Approval failed.");
    }
  }

  async function rejectPayment(paymentId) {
    try {
      const response = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, status: "rejected" })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not reject payment.");
      setMessage("Payment rejected.");
      await loadPayments();
    } catch (error) {
      setMessage(error.message || "Could not reject payment.");
    }
  }

  async function deletePayment(paymentId) {
    if (!window.confirm("Delete this payment from the queue?")) return;
    try {
      const response = await fetch("/api/admin/payments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete payment.");
      setMessage("Payment deleted.");
      await loadPayments();
    } catch (error) {
      setMessage(error.message || "Could not delete payment.");
    }
  }

  async function generateAccessToken(paymentId) {
    try {
      const response = await fetch("/api/admin/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not generate access token.");
      setMessage(`Access token: ${data.token} (send to ${data.phoneNumber || "the user"})`);
    } catch (error) {
      setMessage(error.message || "Could not generate access token.");
    }
  }

  async function createAccessPin() {
    setSaving(true);
    setMessage("");
    setGeneratedPin("");
    try {
      const response = await fetch("/api/admin/pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: pinPlan }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create access PIN.");
      setGeneratedPin(data.pin);
      setGeneratedPinPlan(data.plan || pinPlan);
      setMessage(`Access PIN created. It expires ${new Date(data.expiresAt).toLocaleString()}.`);
    } catch (error) {
      setMessage(error.message || "Could not create access PIN.");
    } finally {
      setSaving(false);
    }
  }

  async function revokeUser(userId) {
    try {
      const response = await fetch("/api/admin/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not revoke premium.");
      setMessage("Premium access revoked.");
    } catch (error) {
      setMessage(error.message || "Could not revoke premium.");
    }
  }

  if (!isAuthorized) {
    return (
      <main className="app-shell">
        <Navigation />
        <section className="content page-content admin-page">
          <span className="eyebrow">ADMIN ACCESS</span>
          <h1 className="page-title">Enter the admin password.</h1>
          <form className="movie-form" onSubmit={handlePasswordSubmit}>
            <label>
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" />
            </label>
            <button type="submit" disabled={saving}>{saving ? "Checking..." : "Access admin"}</button>
            {accessMessage && <p className="admin-message" role="status">{accessMessage}</p>}
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <Navigation />
      <section className="content page-content admin-page">
        <span className="eyebrow">CONTENT MANAGEMENT</span>
        <h1 className="page-title">Admin <i>Dashboard.</i></h1>
        <div className="admin-summary">
          <span><b>{movies.length}</b> catalog titles</span>
          <span><b>{new Set(movies.flatMap((movie) => movie.categories || [])).size}</b> categories</span>
          <span>{payments.filter((payment) => payment.status === "pending").length} pending payments</span>
        </div>

        <nav className="admin-nav" aria-label="Admin sections">
          <button type="button" className={activeView === "movies" ? "active" : ""} onClick={() => setActiveView("movies")}>Add new movie</button>
          <button type="button" className={activeView === "payments" ? "active" : ""} onClick={() => setActiveView("payments")}>Payment queue</button>
          <button type="button" className={activeView === "wallets" ? "active" : ""} onClick={() => setActiveView("wallets")}>User wallets</button>
          <button type="button" className={activeView === "users" ? "active" : ""} onClick={() => setActiveView("users")}>Signed-in users</button>
          <button type="button" className={activeView === "settings" ? "active" : ""} onClick={() => setActiveView("settings")}>Premium settings</button>
        </nav>

        {activeView === "movies" && <div className="admin-layout">
          <form className="movie-form" onSubmit={submit}>
            <div className="form-heading">
              <h2>{editingId ? "Edit movie" : "Add new movie"}</h2>
              {editingId && <button type="button" onClick={() => { setEditingId(""); setForm(blankMovie); }}>Cancel</button>}
            </div>

            <label>Movie title
              <input required name="title" value={form.title} onChange={change} />
            </label>
            <div className="form-pair">
              <label>Year
                <input name="year" value={form.year} onChange={change} inputMode="numeric" />
              </label>
              <label>Rating
                <input name="rating" value={form.rating} onChange={change} inputMode="decimal" />
              </label>
            </div>
            <label>Categories
              <input required name="categories" value={form.categories} onChange={change} placeholder="Action, Sci-Fi" />
            </label>
            <label>Display genre
              <input name="genre" value={form.genre} onChange={change} placeholder="Action · Sci-Fi" />
            </label>
            <label>Description
              <textarea name="description" value={form.description} onChange={change} rows="3" />
            </label>
            <label>Duration
              <input name="duration" value={form.duration} onChange={change} placeholder="2h 34m" />
            </label>
            <label>Movie price (SOL)
              <input type="number" name="price" value={form.price} onChange={change} step="0.01" min="0" placeholder="0.01" />
            </label>
            <label>Poster URL
              <input name="image" value={form.image} onChange={change} placeholder="https://..." />
            </label>
            <label>Upload poster
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload(event, "image")} disabled={Boolean(uploading)} />
            </label>
            <label>Video URL
              <input name="videoUrl" value={form.videoUrl} onChange={change} placeholder="https://..." />
            </label>
            <label>Upload video
              <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => upload(event, "videoUrl")} disabled={Boolean(uploading)} />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Update movie" : "Create movie"}</button>
            </div>
            {message && <p className="admin-message" role="status">{message}</p>}
          </form>

        </div>}

        {activeView === "settings" && <div className="admin-layout">
          <form className="movie-form" onSubmit={savePremiumSettings}>
            <div className="form-heading">
              <h2>Premium payment settings</h2>
            </div>

            <label>MTN/Airtel phone number
              <input name="phoneNumber" value={premiumConfig.phoneNumber} onChange={(event) => setPremiumConfig({ ...premiumConfig, phoneNumber: event.target.value })} placeholder="0785552454" />
            </label>

            <label>Amount to receive (UGX)
              <input type="number" min="1" name="amount" value={premiumConfig.amount} onChange={(event) => setPremiumConfig({ ...premiumConfig, amount: Number(event.target.value || 0) })} />
            </label>

            <fieldset className="admin-plan-prices">
              <legend>Plan prices (UGX)</legend>
              {planOptions.map((plan) => <label key={plan.value}>{plan.shortLabel}
                <input type="number" min="1" value={premiumConfig.planPrices?.[plan.value] || 0} onChange={(event) => setPremiumConfig({ ...premiumConfig, planPrices: { ...premiumConfig.planPrices, [plan.value]: Number(event.target.value || 0) } })} />
              </label>)}
            </fieldset>

            <label>Token expiry (minutes)
              <input type="number" min="1" name="tokenExpiryMinutes" value={premiumConfig.tokenExpiryMinutes} onChange={(event) => setPremiumConfig({ ...premiumConfig, tokenExpiryMinutes: Number(event.target.value || 1) })} />
            </label>

            <label>Movies watched before pay
              <input type="number" min="1" name="requiresWatchedMovies" value={premiumConfig.requiresWatchedMovies} onChange={(event) => setPremiumConfig({ ...premiumConfig, requiresWatchedMovies: Number(event.target.value || 1) })} />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save payment settings"}</button>
            </div>
            <div className="admin-pin-tools">
              <h3>Create access PIN</h3>
              <p>Generate a one-time PIN that any signed-in user can redeem to unlock Premium.</p>
              <label>PIN Premium plan
                <select value={pinPlan} onChange={(event) => setPinPlan(event.target.value)}>
                  {planOptions.map((plan) => <option key={plan.value} value={plan.value}>{plan.shortLabel} ({premiumConfig.planPrices?.[plan.value] || 0} UGX)</option>)}
                </select>
              </label>
              <button type="button" onClick={createAccessPin} disabled={saving}>{saving ? "Creating..." : "Generate access PIN"}</button>
              {generatedPin && <code className="generated-pin" aria-label="Generated access PIN">{planOptions.find((plan) => plan.value === generatedPinPlan)?.shortLabel || generatedPinPlan}: {generatedPin}</code>}
            </div>
            {message && <p className="admin-message" role="status">{message}</p>}
          </form>
        </div>}

        {activeView === "payments" && <section className="movie-form" style={{ marginTop: 28 }}>
          <div className="form-heading">
            <h2>Payment queue</h2>
          </div>
          {payments.length === 0 ? (
            <p className="empty">No payments have been submitted yet.</p>
          ) : (
            <div className="payment-list">
              {payments.map((payment) => (
                <div key={payment.paymentId || payment._id} className="payment-item">
                  <div>
                    <strong>{payment.username || payment.email || payment.userId || "Guest user"}</strong>
                    <small>{payment.status}</small>
                  </div>
                  <ul>
                    <li>Plan: {payment.plan || "1-month"}</li>
                    <li>Phone: {payment.phoneNumber}</li>
                    <li>Amount: {payment.amount}</li>
                  </ul>
                  <div className="form-actions payment-actions">
                    {planOptions.map((plan) => (
                      <button key={plan.value} type="button" onClick={() => approvePayment(payment.paymentId, plan.value)}>
                        Approve {plan.label} ({plan.shortLabel})
                      </button>
                    ))}
                    {payment.status === "approved" && <button type="button" onClick={() => generateAccessToken(payment.paymentId)}>Generate access token</button>}
                    <button type="button" onClick={() => rejectPayment(payment.paymentId)}>Reject</button>
                    {payment.userId && <button type="button" onClick={() => revokeUser(payment.userId)}>Revoke premium</button>}
                    <button type="button" className="danger-button" onClick={() => deletePayment(payment.paymentId)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>}

        {activeView === "wallets" && <section className="movie-form" style={{ marginTop: 28 }}>
          <div className="form-heading">
            <h2>User wallets</h2>
          </div>
          <div className="form-actions">
            <input value={walletSearch} onChange={(event) => setWalletSearch(event.target.value)} placeholder="Search username, email, address, or index" />
            <button type="button" onClick={() => loadWallets()}>Search wallets</button>
          </div>
          {wallets.length === 0 ? <p className="empty">No wallets found.</p> : <div className="payment-list">{wallets.map((wallet) => <div key={wallet.userId} className="payment-item"><strong>{wallet.username || wallet.email || "User"}</strong><ul><li>Email: {wallet.email || "-"}</li><li>Address: {wallet.walletAddress}</li><li>Index: {wallet.walletIndex}</li><li>SOL balance: {wallet.solBalance === null ? "Unavailable" : wallet.solBalance}</li><li>Created: {wallet.walletCreatedAt ? new Date(wallet.walletCreatedAt).toLocaleString() : "-"}</li></ul></div>)}</div>}
        </section>}

        {activeView === "users" && <section className="movie-form" style={{ marginTop: 28 }}>
          <div className="form-heading">
            <h2>Signed-in users and Premium plans</h2>
          </div>
          <div className="form-actions">
            <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search name, email, or user ID" />
            <button type="button" onClick={() => loadUsers()}>Search users</button>
          </div>
          {users.length === 0 ? <p className="empty">No signed-in users found.</p> : <div className="payment-list">{users.map((user) => { const active = user.premium && (user.premiumPlan === "lifetime" || (user.premiumExpiresAt && new Date(user.premiumExpiresAt).getTime() > Date.now())); return <div key={user.userId} className="payment-item"><strong>{user.username || user.email || "Unnamed user"}</strong><small>{active ? "Premium active" : "Free"} · {user.authType || "account"}</small><ul><li>Email: {user.email || "-"}</li><li>Plan: {active ? user.premiumPlan : "free"}</li><li>Expires: {user.premiumPlan === "lifetime" ? "Never" : user.premiumExpiresAt ? new Date(user.premiumExpiresAt).toLocaleString() : "-"}</li><li>Created: {user.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}</li></ul><div className="form-actions payment-actions">{planOptions.map((plan) => <button key={plan.value} type="button" onClick={() => assignUserPlan(user.userId, plan.value)}>Give {plan.shortLabel}</button>)}{active && <button type="button" onClick={() => revokeUserPlan(user.userId)}>Revoke Premium</button>}</div></div>; })}</div>}
        </section>}
      </section>
    </main>
  );
}
