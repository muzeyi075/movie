import { requireAdmin } from "@/lib/admin-auth";
import { connectMongoose } from "@/lib/mongoose";
import User from "@/models/User";

export async function GET(request) {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;

  try {
    await connectMongoose();
    const query = new URL(request.url).searchParams.get("q")?.trim() || "";
    const filter = query
      ? { $or: [{ username: { $regex: query, $options: "i" } }, { email: { $regex: query, $options: "i" } }, { userId: { $regex: query, $options: "i" } }] }
      : {};
    const users = await User.find(filter)
      .select("userId username email authType premium premiumPlan premiumExpiresAt createdAt sessionId")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return Response.json({ users });
  } catch (error) {
    return Response.json({ error: error.message || "Could not load signed-in users." }, { status: 503 });
  }
}
