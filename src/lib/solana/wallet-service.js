import { connectMongoose } from "@/lib/mongoose";
import User from "@/models/User";
import Counter from "@/models/Counter";
import { encryptWalletSecret } from "@/lib/security/encryption";
import { deriveSolanaWallet } from "./hd-wallet";

export async function ensureUserWallet({ userId, username = "", email = "" }) {
  await connectMongoose();
  const existing = await User.findOne({ userId }).select("walletAddress walletIndex derivationPath walletCreatedAt").lean();
  if (existing?.walletAddress && Number.isInteger(existing.walletIndex)) return existing;

  await User.updateOne({ userId }, { $setOnInsert: { userId, username, email } }, { upsert: true });
  const counter = await Counter.findOneAndUpdate(
    { _id: "solana_wallet" },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  const walletIndex = counter.sequence - 1;
  const wallet = deriveSolanaWallet(walletIndex);
  const encryptedSecret = encryptWalletSecret(wallet.secretKey);
  const result = await User.findOneAndUpdate(
    { userId, walletAddress: { $exists: false } },
    { $set: { walletAddress: wallet.walletAddress, walletIndex, derivationPath: wallet.derivationPath, walletCreatedAt: new Date(), encryptedSecret, username, email } },
    { new: true, projection: { walletAddress: 1, walletIndex: 1, derivationPath: 1, walletCreatedAt: 1 } }
  ).lean();
  if (result) return result;
  const winner = await User.findOne({ userId }).select("walletAddress walletIndex derivationPath walletCreatedAt").lean();
  if (!winner?.walletAddress) throw new Error("Wallet provisioning did not complete; retry the registration.");
  return winner;
}