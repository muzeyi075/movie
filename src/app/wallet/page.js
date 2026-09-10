"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/navigation";
import { fetchWithAuth } from "@/lib/client-auth";

export default function WalletPage() {
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(null);
  const [available, setAvailable] = useState(null);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const walletResponse = await fetchWithAuth("/api/wallet");
    const walletData = await walletResponse.json();
    if (!walletResponse.ok) throw new Error(walletData.error || "Sign in to view your wallet.");
    setWallet(walletData);
    const balanceResponse = await fetchWithAuth("/api/wallet/balance");
    const balanceData = await balanceResponse.json();
    if (!balanceResponse.ok) throw new Error(balanceData.error || "Could not load wallet balance.");
    setBalance(balanceData.solBalance);
    setAvailable(balanceData.availableForMovies);
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message || "Could not load your wallet."));
  }, []);

  async function copyAddress() {
    if (!wallet?.walletAddress) return;
    await navigator.clipboard.writeText(wallet.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function refreshDeposits() {
    setRefreshing(true);
    setMessage("");
    try {
      await load();
    } catch (error) {
      setMessage(error.message || "Could not refresh deposits.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <main className="app-shell">
      <Navigation />
      <section className="content page-content wallet-page">
        <span className="eyebrow">CUSTODIAL SOLANA WALLET</span>
        <h1 className="page-title">My Solana <i>Wallet.</i></h1>
        {wallet ? (
          <>
            <div className="wallet-card">
              <small>Wallet address</small>
              <strong>{wallet.walletAddress}</strong>
              <button type="button" className="watch-button" onClick={copyAddress}>{copied ? "Copied" : "Copy address"}</button>
              <span>Wallet index {wallet.walletIndex}</span>
            </div>
            <div className="wallet-balance">
              <small>SOL Balance</small>
              <strong>{balance === null ? "Loading..." : `${Number(balance).toFixed(6)} SOL`}</strong>
              <small>Available from deposits</small>
              <strong>{available === null ? "Loading..." : `${Number(available).toFixed(6)} SOL`}</strong>
            </div>
            <p className="wallet-warning">Send SOL to this address. After the transfer confirms, tap refresh so the deposit is credited to your Session ID.</p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button type="button" className="watch-button" onClick={refreshDeposits} disabled={refreshing}>{refreshing ? "Scanning…" : "Refresh deposits"}</button>
              <Link className="watch-button" href="/premium">Premium</Link>
            </div>
            {message && <p className="admin-message" role="status">{message}</p>}
          </>
        ) : message ? (
          <div className="empty-state">
            <h2>{message}</h2>
            <Link className="watch-button" href="/profile">Go to profile</Link>
          </div>
        ) : (
          <p className="empty">Loading wallet...</p>
        )}
      </section>
    </main>
  );
}
