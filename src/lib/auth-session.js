import crypto from "crypto";

export function normalizeBase64Url(value = "") {
  return String(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeBase64Url(value = "") {
  const normalized = normalizeBase64Url(value);
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

export function encodeBase64Url(value) {
  return normalizeBase64Url(Buffer.from(value).toString("base64"));
}

export function sessionSecret() {
  return process.env.JWT_SECRET || "cinemora-dev-secret";
}

export function createSessionToken(payload) {
  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = encodeBase64Url(JSON.stringify(payload));
  const signatureInput = `${header}.${body}`;
  const signature = crypto.createHmac("sha256", sessionSecret()).update(signatureInput).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifySessionToken(token) {
  if (!token) return null;
  const parts = String(token).split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = crypto.createHmac("sha256", sessionSecret()).update(`${header}.${body}`).digest("base64url");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) return null;
  try {
    return JSON.parse(decodeBase64Url(body).toString("utf8"));
  } catch {
    return null;
  }
}

export function getSessionTokenFromRequest(request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith("cinemora_session="));
  if (!match) return null;
  return decodeURIComponent(match.split("=").slice(1).join("="));
}

export function setSessionCookie(response, user) {
  const userId = user.userId || user.sessionId;
  const token = createSessionToken({
    uid: userId,
    userId,
    sessionId: user.sessionId || userId,
    email: user.email || "",
    name: user.name || user.username || "",
    username: user.username || user.name || "",
    authType: user.authType || "google",
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  });
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.headers.set("Set-Cookie", `cinemora_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${60 * 60 * 24 * 7}`);
  return response;
}

export function clearSessionCookie(response) {
  response.headers.set("Set-Cookie", "cinemora_session=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0");
  return response;
}
