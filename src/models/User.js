import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  username: String,
  email: String,
  walletAddress: { type: String, unique: true, sparse: true, index: true },
  walletIndex: { type: Number, unique: true, sparse: true, index: true },
  derivationPath: String,
  walletCreatedAt: Date,
  encryptedSecret: { type: String, select: false },
  walletBalance: { type: Number, default: 0, min: 0 }, // Available balance in SOL
  premium: Boolean,
  premiumPlan: String,
  premiumExpiresAt: Date,
  authType: String,
  publicKey: String,
  sessionId: { type: String, unique: true, sparse: true, index: true },
  avatar: String,
}, { collection: "users", strict: false, timestamps: true });

export default mongoose.models.User || mongoose.model("User", userSchema);