import mongoose from "mongoose";

const watchPartyMessageSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  username: { type: String, required: true, maxlength: 80 },
  message: { type: String, required: true, trim: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now, index: true },
}, { collection: "watchPartyMessages", versionKey: false });

watchPartyMessageSchema.index({ roomId: 1, createdAt: -1 });

export default mongoose.models.WatchPartyMessage || mongoose.model("WatchPartyMessage", watchPartyMessageSchema);
