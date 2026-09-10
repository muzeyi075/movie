import { connectMongoose } from "@/lib/mongoose";
import Deposit from "@/models/Deposit";
import User from "@/models/User";
import { getSolanaConnection, getWalletAccount } from "./connection";

const supportedCommitments = new Set(["confirmed", "finalized"]);

export async function processIncomingSolSignature({ userId, walletAddress, signature, commitment = "finalized" }) {
  if (!supportedCommitments.has(commitment)) throw new Error("Only confirmed or finalized deposits are supported.");
  await connectMongoose();
  const connection = getSolanaConnection();
  const status = await connection.getSignatureStatuses([signature]);
  const signatureStatus = status.value[0];
  if (!signatureStatus || signatureStatus.err) return null;
  if (commitment === "finalized" && signatureStatus.confirmationStatus !== "finalized") return null;
  if (commitment === "confirmed" && !["confirmed", "finalized"].includes(signatureStatus.confirmationStatus)) return null;

  const transaction = await connection.getParsedTransaction(signature, { commitment: "finalized", maxSupportedTransactionVersion: 0 });
  if (!transaction?.meta || transaction.meta.err) return null;
  const destination = getWalletAccount(walletAddress).toBase58();
  let lamports = 0;
  for (const instruction of transaction.transaction.message.instructions) {
    if (instruction.program !== "system" || instruction.parsed?.type !== "transfer") continue;
    if (instruction.parsed.info.destination !== destination) continue;
    lamports += Number(instruction.parsed.info.lamports || 0);
  }
  if (lamports <= 0) return null;

  try {
    return await Deposit.create({ userId, walletAddress: destination, signature, mint: null, amount: lamports / 1_000_000_000, token: "SOL", status: commitment === "finalized" ? "finalized" : "confirmed", confirmationStatus: signatureStatus.confirmationStatus, slot: transaction.slot });
  } catch (error) {
    if (error?.code === 11000) return Deposit.findOne({ signature }).lean();
    throw error;
  }
}

export async function scanUserWalletDeposits({ userId, walletAddress, limit = 50, commitment = "finalized" }) {
  const signatures = await getSolanaConnection().getSignaturesForAddress(getWalletAccount(walletAddress), { limit: Math.min(Number(limit) || 50, 100), commitment });
  const deposits = [];
  for (const item of signatures) {
    if (item.err) continue;
    const deposit = await processIncomingSolSignature({ userId, walletAddress, signature: item.signature, commitment });
    if (deposit) deposits.push(deposit);
  }
  return deposits;
}

export async function findUserForWallet(walletAddress) {
  await connectMongoose();
  return User.findOne({ walletAddress }).select("userId walletAddress").lean();
}