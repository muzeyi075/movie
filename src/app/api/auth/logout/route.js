import { clearSessionCookie } from "@/lib/auth-session";

export async function POST(request) {
  const response = Response.json({ ok: true, message: "Signed out." });
  return clearSessionCookie(response);
}
