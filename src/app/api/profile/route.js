import { getProfile, saveProfile } from "@/lib/profile-store";

export async function GET() { return Response.json({ profile: await getProfile() }); }
export async function PATCH(request) { const input = await request.json(); if (!input.name?.trim() || !input.email?.trim()) return Response.json({ error: "Name and email are required." }, { status: 400 }); return Response.json({ profile: await saveProfile({ name: input.name.trim(), email: input.email.trim(), autoplay: Boolean(input.autoplay), quality: input.quality || "Auto", subtitles: Boolean(input.subtitles) }) }); }
