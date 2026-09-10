import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getSolanaConnection, getWalletAccount } from "./connection";

export async function getWalletBalance(walletAddress, commitment = "finalized") {
  const lamports = await getSolanaConnection().getBalance(getWalletAccount(walletAddress), commitment);
  return lamports / LAMPORTS_PER_SOL;
}