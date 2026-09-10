"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Navigation from "@/components/navigation";

const paymentPhoneNumber = "0785552454";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState("");
  const [activationStatus, setActivationStatus] = useState("");
  const [activating, setActivating] = useState(false);
  const plan = searchParams.get("plan") || "Selected plan";
  const amount = searchParams.get("amount") || "0";

  async function copyPhoneNumber() {
    await navigator.clipboard.writeText(paymentPhoneNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function activatePremium(event) {
    event.preventDefault();
    setActivating(true);
    setActivationStatus("");
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
      router.push("/");
    } catch (error) {
      setActivationStatus(error.message || "Could not activate Premium.");
    } finally {
      setActivating(false);
    }
  }

  return (
    <main className="app-shell">
      <Navigation />
      <section className="content page-content premium-content">
        <div className="payment-success-card" role="status">
          <span className="payment-success-icon" aria-hidden="true">✓</span>
          <span className="eyebrow">PAYMENT SUBMITTED</span>
          <h1>We received your request.</h1>
          <p>Your <strong>{plan}</strong> request for <strong>{amount} UGX</strong> is waiting for admin approval.</p>
          <p className="payment-success-note">Send {amount} UGX to:</p>
          <button className="payment-phone-copy" type="button" onClick={copyPhoneNumber} aria-label="Copy payment phone number">
            <strong>{paymentPhoneNumber}</strong>
            <span>{copied ? "Copied" : "Copy number"}</span>
          </button>
          <p className="payment-success-note">You will receive the access token by SMS.</p>
          <form className="payment-token-form" onSubmit={activatePremium}>
            <label htmlFor="payment-access-token">Activate Premium with your token</label>
            <input id="payment-access-token" required value={token} onChange={(event) => setToken(event.target.value)} placeholder="Enter access token" />
            <button className="watch-button" type="submit" disabled={activating}>{activating ? "Activating..." : "Activate Premium"}</button>
            {activationStatus && <p className="admin-message" role="status">{activationStatus}</p>}
          </form>
          <div className="payment-success-actions">
            <Link className="watch-button" href="/premium">Back to Premium</Link>
            <Link className="text-button" href="/profile">View profile</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
