"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navigation from "@/components/navigation";

const defaultConfig = {
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
  requiresWatchedMovies: 1,
};

const premiumPlans = [
  { value: "1-day", label: "1 Day" },
  { value: "1-week", label: "1 Week" },
  { value: "1-month", label: "1 Month" },
  { value: "3-months", label: "3 Months" },
  { value: "lifetime", label: "Lifetime" },
];

export default function PremiumPage() {
  const router = useRouter();
  const [config, setConfig] = useState(defaultConfig);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    phoneNumber: defaultConfig.phoneNumber,
    plan: "1-month",
  });

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch("/api/premium", { cache: "no-store" });
        const data = await response.json();
        if (response.ok) setConfig((current) => ({ ...current, ...data.config }));
      } catch {
        // Keep defaults if the settings endpoint is unavailable.
      }
    }

    loadConfig();
  }, []);

  async function submitPayment(event) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(config.planPrices?.[form.plan] || config.amount),
          phoneNumber: form.phoneNumber || config.phoneNumber,
          plan: form.plan,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not submit payment.");
      const selectedPlan = premiumPlans.find((plan) => plan.value === form.plan)?.label || "selected plan";
      const selectedAmount = Number(config.planPrices?.[form.plan] || config.amount);
      router.push(`/premium/payment-success?plan=${encodeURIComponent(selectedPlan)}&amount=${selectedAmount}`);
    } catch (error) {
      setStatus(error.message || "Could not submit payment.");
    } finally {
      setLoading(false);
    }
  }

  async function redeemToken(event) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/premium", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", token: token.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not activate Premium.");
      setToken("");
      setStatus("Premium access activated. You can continue watching.");
    } catch (error) {
      setStatus(error.message || "Could not activate Premium.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <Navigation />
      <section className="content page-content premium-content">
        <span className="eyebrow">CINEMORA PREMIUM</span>
        <h1 className="page-title">More stories. <i>No limits.</i></h1>

        <div className="premium-stack">
        <form className="movie-form" onSubmit={submitPayment}>
          <h2>Submit payment</h2>
          <fieldset className="premium-plan-options">
            <legend>Choose a plan</legend>
            {premiumPlans.map((plan) => <label className={form.plan === plan.value ? "premium-plan-option selected" : "premium-plan-option"} key={plan.value}><input type="radio" name="premium-plan" value={plan.value} checked={form.plan === plan.value} onChange={(event) => setForm({ ...form, plan: event.target.value })} /><span><strong>{plan.label}</strong><small>{Number(config.planPrices?.[plan.value] || 0)} UGX</small></span></label>)}
          </fieldset>
          <label>Payment phone number
            <input value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} placeholder={config.phoneNumber} />
          </label>
          <p>Amount due: <strong>{Number(config.planPrices?.[form.plan] || config.amount)} UGX</strong></p>
          <button type="submit" disabled={loading}>{loading ? "Submitting..." : `Pay ${premiumPlans.find((plan) => plan.value === form.plan)?.label || "selected plan"} - ${Number(config.planPrices?.[form.plan] || config.amount)} UGX`}</button>
        </form>

        <form className="movie-form" onSubmit={redeemToken}>
          <h2>Have an access token?</h2>
          <label>Access token
            <input required value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste the token from the admin" />
          </label>
          <button type="submit" disabled={loading}>{loading ? "Activating..." : "Activate Premium"}</button>
        </form>
        <div className="premium-account-prompt">
          <p>New here? Create an account first to connect Premium access to your profile.</p>
          <Link className="watch-button" href="/profile">Create account</Link>
        </div>
        </div>

        {status && <p className="admin-message" role="status">{status}</p>}
      </section>
    </main>
  );
}