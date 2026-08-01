import { promises as fs } from "fs";
import path from "path";

const dataFile = path.join(process.cwd(), "data", "profile.json");
const defaultProfile = { name: "Jordan Miller", email: "jordan@example.com", autoplay: true, quality: "Auto", subtitles: true };

export async function getProfile() {
  try { return { ...defaultProfile, ...JSON.parse(await fs.readFile(dataFile, "utf8")) }; }
  catch (error) { if (error.code === "ENOENT") { await saveProfile(defaultProfile); return defaultProfile; } throw error; }
}

export async function saveProfile(profile) {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  const nextProfile = { ...defaultProfile, ...profile };
  await fs.writeFile(dataFile, JSON.stringify(nextProfile, null, 2), "utf8");
  return nextProfile;
}
