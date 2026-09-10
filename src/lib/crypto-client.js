import { createOrLoadCryptoIdentity, getStoredIdentity, signChallenge } from "@/lib/indexeddb";

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

export async function createCryptoAccount() {
  const identity = await createOrLoadCryptoIdentity();
  await postJson("/api/auth/register-crypto", {
    publicKey: identity.publicKey,
    sessionId: identity.sessionId,
    username: `Session ${identity.sessionId.slice(2, 10)}`,
  });
  return identity;
}

export async function signInWithStoredCryptoIdentity(expectedSessionId = null) {
  const identity = await getStoredIdentity();
  if (!identity?.publicKey || !identity?.privateKey) {
    throw new Error("No key pair on this device. Tap Create Account to generate one.");
  }

  const normalizedExpectedSessionId = String(expectedSessionId || "").trim();
  if (normalizedExpectedSessionId && identity.sessionId && identity.sessionId !== normalizedExpectedSessionId) {
    throw new Error("This device is not registered with that Session ID.");
  }

  const challenge = await postJson("/api/auth/challenge", { publicKey: identity.publicKey, sessionId: identity.sessionId });
  const signature = await signChallenge(challenge.challenge);
  return postJson("/api/auth/verify", {
    challengeId: challenge.challengeId,
    challenge: challenge.challenge,
    publicKey: identity.publicKey,
    sessionId: identity.sessionId,
    signature,
  });
}
