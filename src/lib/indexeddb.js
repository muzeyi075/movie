const DB_NAME = "cinemora-crypto";
const STORE_NAME = "crypto-keys";
const IDENTITY_ID = "default";

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) return reject(new Error("IndexedDB is unavailable in this browser."));
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not access IndexedDB."));
  });
}

function bytesToBase64(bytes) {
  const arr = new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < arr.length; i += 1) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(String(value || "").replace(/^(pkcs8:|spki:)/, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function sessionIdFromPublicKeyBytes(rawPublicKey) {
  const hex = bytesToHex(rawPublicKey).slice(0, 64).padEnd(64, "0");
  return `pk${hex}`;
}

export async function savePrivateKey(privateKey, userId = IDENTITY_ID) {
  const existing = await getStoredIdentity(userId);
  return saveIdentity({ ...(existing || {}), privateKey }, userId);
}

export async function saveIdentity(identity, userId = IDENTITY_ID) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const request = tx.objectStore(STORE_NAME).put({
      id: userId,
      value: identity?.privateKey,
      publicKey: identity?.publicKey,
      sessionId: identity?.sessionId,
      privateKey: identity?.privateKey,
      algorithm: identity?.algorithm || "ECDSA-P256",
    });
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error || new Error("Could not save private key."));
  });
}

export async function getPrivateKey(userId = IDENTITY_ID) {
  const identity = await getStoredIdentity(userId);
  return identity?.privateKey || null;
}

export async function getStoredIdentity(userId = IDENTITY_ID) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(userId);
    request.onsuccess = () => {
      const record = request.result;
      if (!record) return resolve(null);
      const privateKey = record.privateKey || record.value || null;
      if (!privateKey && !record.publicKey) return resolve(null);
      resolve({
        publicKey: record.publicKey || null,
        privateKey,
        sessionId: record.sessionId || null,
        algorithm: record.algorithm || null,
      });
    };
    request.onerror = () => reject(request.error || new Error("Could not load private key."));
  });
}

export async function generateCryptoIdentity() {
  if (!window.crypto?.subtle) throw new Error("This browser does not support Web Crypto.");
  const keyPair = await window.crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const spki = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const pkcs8 = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const raw = new Uint8Array(await window.crypto.subtle.exportKey("raw", keyPair.publicKey));
  return {
    sessionId: sessionIdFromPublicKeyBytes(raw.slice(1, 33)),
    publicKey: `spki:${bytesToBase64(spki)}`,
    privateKey: `pkcs8:${bytesToBase64(pkcs8)}`,
    algorithm: "ECDSA-P256",
  };
}

export async function createOrLoadCryptoIdentity() {
  const existing = await getStoredIdentity();
  if (existing?.publicKey && existing?.privateKey && existing?.sessionId && existing.algorithm === "ECDSA-P256") return existing;
  const identity = await generateCryptoIdentity();
  await saveIdentity(identity);
  return identity;
}

export async function signChallenge(challenge, userId = IDENTITY_ID) {
  const privateKeyData = await getPrivateKey(userId);
  if (!privateKeyData) throw new Error("No private key available for this user.");
  const privateKey = await window.crypto.subtle.importKey("pkcs8", base64ToBytes(privateKeyData), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const signature = await window.crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, new TextEncoder().encode(challenge));
  return bytesToBase64(signature);
}

export function base64ToBuffer(value) {
  return base64ToBytes(value);
}
