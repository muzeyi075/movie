import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequence: { type: Number, required: true, default: 0 },
}, { collection: "counters" });

export default mongoose.models.Counter || mongoose.model("Counter", counterSchema);