import mongoose from "mongoose";

const depositSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  walletAddress: { type: String, required: true, index: true },
  signature: { type: String, required: true, unique: true, index: true },
  mint: { type: String, default: null },
  amount: { type: Number, required: true, min: 0 },
  spentAmount: { type: Number, default: 0, min: 0 }, // Amount deducted for movie fees
  token: { type: String, required: true, default: "SOL" },
  status: { type: String, enum: ["detected", "confirmed", "finalized", "rejected"], default: "detected", index: true },
  confirmationStatus: String,
  slot: Number,
  createdAt: { type: Date, default: Date.now },
}, { collection: "deposits", timestamps: true });

export default mongoose.models.Deposit || mongoose.model("Deposit", depositSchema);