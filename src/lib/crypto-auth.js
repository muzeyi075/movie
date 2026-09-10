import crypto from "crypto";

export function createChallengeBundle() {
  const challengeId = `challenge_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const challenge = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  return { challengeId, challenge, expiresAt };
}

export function normalizePublicKey(publicKey) {
  return String(publicKey || "").trim();
}

export async function verifyEcdsaSignature({ publicKey, challenge, signature }) {
  try {
    const normalized = normalizePublicKey(publicKey);
    const keyMaterial = normalized.replace(/^spki:/, "");
    const cryptoKey = crypto.createPublicKey({ key: Buffer.from(keyMaterial, "base64"), format: "der", type: "spki" });
    return crypto.verify(
      "sha256",
      Buffer.from(challenge, "utf8"),
      { key: cryptoKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(signature, "base64"),
    );
  } catch {
    return false;
  }
}
