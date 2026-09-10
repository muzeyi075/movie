import mongoose from "mongoose";

const participantSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true, maxlength: 80 },
  joinedAt: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
}, { _id: false });

const watchPartySchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true, index: true, match: /^[A-Z0-9]{6,12}$/ },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  hostId: { type: String, required: true, index: true },
  movieId: { type: String, required: true, index: true },
  privacy: { type: String, enum: ["public", "private"], default: "public", index: true },
  status: { type: String, enum: ["active", "ended"], default: "active", index: true },
  playback: {
    playing: { type: Boolean, default: false },
    position: { type: Number, default: 0, min: 0 },
    updatedAt: { type: Date, default: Date.now },
  },
  hostControlsPlayback: { type: Boolean, default: true },
  hostDisconnectedAt: { type: Date, default: null },
  participants: { type: [participantSchema], default: [] },
  lastActivityAt: { type: Date, default: Date.now, index: true },
}, { collection: "watchParties", timestamps: true, versionKey: false });

watchPartySchema.index({ privacy: 1, status: 1, createdAt: -1 });
watchPartySchema.index({ status: 1, lastActivityAt: 1 });

export default mongoose.models.WatchParty || mongoose.model("WatchParty", watchPartySchema);
