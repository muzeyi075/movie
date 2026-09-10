import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true, index: true },
  userId: String,
  actorId: String,
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true },
}, { collection: "auditLogs", timestamps: true });

export default mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);