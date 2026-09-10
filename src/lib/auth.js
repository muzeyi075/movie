import { adminAuth } from "@/lib/firebase-admin";
import { getSessionTokenFromRequest, verifySessionToken } from "@/lib/auth-session";

export async function authenticateRequest(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer /i, "").trim();
    if (token) return await adminAuth.verifyIdToken(token);
    const session = verifySessionToken(getSessionTokenFromRequest(request));
    if (!session || (session.exp && session.exp < Math.floor(Date.now() / 1000))) return null;
    return session;
  } catch {
    return null;
  }
}

export function getUserId(decodedToken) {
  return decodedToken?.uid || decodedToken?.userId || decodedToken?.sessionId || null;
}

export function unauthorizedResponse() {
  return Response.json({ error: "Authentication required." }, { status: 401 });
}
