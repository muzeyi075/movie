import admin from "firebase-admin";
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Load environment variables from .env if not already loaded
if (!process.env.FIREBASE_ADMIN_PROJECT_ID) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.join(__dirname, "../../.env");
  config({ path: envPath });
}

// Strip quotes and handle escaped newlines
const privateKeyRaw = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").trim();
const privateKey = privateKeyRaw
  .replace(/^["']|["']$/g, "") // Remove surrounding quotes
  .replace(/\\n/g, "\n");       // Replace escaped newlines with actual newlines

const serviceAccount = {
  project_id: (process.env.FIREBASE_ADMIN_PROJECT_ID || "").trim() || "movie-mzy",
  client_email: (process.env.FIREBASE_ADMIN_CLIENT_EMAIL || "").trim() || "firebase-adminsdk-fbsvc@movie-mzy.iam.gserviceaccount.com",
  private_key: privateKey,
};

// Validate service account
if (!serviceAccount.project_id || typeof serviceAccount.project_id !== "string") {
  throw new Error(`Invalid FIREBASE_ADMIN_PROJECT_ID: ${serviceAccount.project_id}`);
}
if (!serviceAccount.client_email || typeof serviceAccount.client_email !== "string") {
  throw new Error(`Invalid FIREBASE_ADMIN_CLIENT_EMAIL: ${serviceAccount.client_email}`);
}
if (!serviceAccount.private_key || typeof serviceAccount.private_key !== "string") {
  throw new Error(`Invalid FIREBASE_ADMIN_PRIVATE_KEY: ${serviceAccount.private_key ? "present but not string" : "missing"}`);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const adminAuth = admin.auth();
