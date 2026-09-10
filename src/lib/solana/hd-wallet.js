import bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import { Keypair, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";

export function deriveSolanaWallet(walletIndex) {
  const index = Number(walletIndex);
  const mnemonic = String(process.env.SOLANA_MASTER_MNEMONIC || "").trim();
  if (!mnemonic) throw new Error("SOLANA_MASTER_MNEMONIC is not configured.");
  if (!Number.isSafeInteger(index) || index < 0 || index > 0x7fffffff) throw new Error("Invalid Solana wallet index.");
  if (!bip39.validateMnemonic(mnemonic, bip39.wordlists.english)) throw new Error("SOLANA_MASTER_MNEMONIC is invalid.");

  const derivationPath = `m/44'/501'/${index}'/0'`;
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const derived = derivePath(derivationPath, seed.toString("hex")).key;
  const keypair = Keypair.fromSecretKey(nacl.sign.keyPair.fromSeed(derived).secretKey);
  return {
    walletAddress: new PublicKey(keypair.publicKey).toBase58(),
    walletIndex: index,
    derivationPath,
    secretKey: Buffer.from(keypair.secretKey),
  };
}