import { Connection, PublicKey } from "@solana/web3.js";

let connection;

export function getSolanaConnection() {
  const rpcUrl = String(process.env.SOLANA_RPC_URL || "").trim();
  if (!rpcUrl) throw new Error("SOLANA_RPC_URL is not configured.");
  if (!connection || connection.rpcEndpoint !== rpcUrl) connection = new Connection(rpcUrl, process.env.SOLANA_COMMITMENT || "finalized");
  return connection;
}

export function getWalletAccount(walletAddress) {
  try { return new PublicKey(walletAddress); } catch { throw new Error("Invalid Solana wallet address."); }
}