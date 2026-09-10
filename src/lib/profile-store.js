import { getDatabase } from "@/lib/mongodb";

const defaultProfile = { name: "Jordan Miller", email: "jordan@example.com", autoplay: true, quality: "Auto", subtitles: true };
async function collection() { return (await getDatabase()).collection("profiles"); }

export async function getProfile(userId = "default") {
  const profile = await (await collection()).findOne({ userId }, { projection: { _id: 0, userId: 0 } });
  if (profile) return { ...defaultProfile, ...profile };
  return saveProfile(userId, defaultProfile);
}

export async function saveProfile(userId = "default", profile) {
  const nextProfile = { ...defaultProfile, ...profile };
  await (await collection()).updateOne({ userId }, { $set: { ...nextProfile, userId, updatedAt: new Date() } }, { upsert: true });
  return nextProfile;
}
