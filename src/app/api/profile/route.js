import { getProfile, saveProfile } from "@/lib/profile-store";
import { authenticateRequest, getUserId, unauthorizedResponse } from "@/lib/auth";
import { errorResponse, readJson } from "@/lib/api";
import { findUserByEmail, findUserById, isPremiumActive } from "@/lib/user-store";

async function withSession(profile, decoded, uid) {
  const user = await findUserById(uid) || (decoded.email ? await findUserByEmail(decoded.email) : null);
  return {
    ...profile,
    sessionId: decoded.sessionId || (decoded.authType === "crypto" ? uid : profile.sessionId || null),
    authType: decoded.authType || "google",
    premium: isPremiumActive(user),
    premiumPlan: user?.premiumPlan || "free",
    premiumExpiresAt: user?.premiumExpiresAt || null,
  };
}

export async function GET(request) {
  const decoded = await authenticateRequest(request);
  if (!decoded) return unauthorizedResponse();
  const uid = getUserId(decoded);
  if (!uid) return unauthorizedResponse();
  return Response.json({ profile: await withSession(await getProfile(uid), decoded, uid) });
}

export async function PATCH(request) {
  try {
    const decoded = await authenticateRequest(request);
    if (!decoded) return unauthorizedResponse();
    const uid = getUserId(decoded);
    if (!uid) return unauthorizedResponse();
    const input = await readJson(request);
    const isCrypto = decoded.authType === "crypto";
    if (!input.name?.trim()) return Response.json({ error: "Name is required." }, { status: 400 });
    if (!isCrypto) {
      if (!input.email?.trim()) return Response.json({ error: "Name and email are required." }, { status: 400 });
      if (!/^\S+@\S+\.\S+$/.test(input.email.trim())) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    } else if (input.email?.trim() && !/^\S+@\S+\.\S+$/.test(input.email.trim())) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    const quality = ["Auto", "1080p", "720p"].includes(input.quality) ? input.quality : "Auto";
    const saved = await saveProfile(uid, { name: input.name.trim(), email: input.email?.trim() || "", autoplay: Boolean(input.autoplay), quality, subtitles: Boolean(input.subtitles) });
    return Response.json({ profile: await withSession(saved, decoded, uid) });
  } catch (error) { return errorResponse(error); }
}
