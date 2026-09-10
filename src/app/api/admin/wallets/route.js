import { requireAdmin } from "@/lib/admin-auth";
import { connectMongoose } from "@/lib/mongoose";
import User from "@/models/User";
import { getWalletBalance } from "@/lib/solana/balance";

export async function GET(request) {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;
  try {
    await connectMongoose();
    const query = new URL(request.url).searchParams.get("q")?.trim() || "";
    const filter = query ? { $or: [{ username: { $regex: query, $options: "i" } }, { email: { $regex: query, $options: "i" } }, { walletAddress: { $regex: query, $options: "i" } }, ...(Number.isInteger(Number(query)) ? [{ walletIndex: Number(query) }] : [])] } : {};
    const users = await User.find(filter).select("userId username email walletAddress walletIndex walletCreatedAt").sort({ walletIndex: 1 }).limit(100).lean();
    const wallets = await Promise.all(users.filter((user) => user.walletAddress).map(async (user) => ({ ...user, solBalance: await getWalletBalance(user.walletAddress).catch(() => null) })));
    return Response.json({ wallets });
  } catch (error) {
    return Response.json({ error: error.message || "Could not load wallets." }, { status: 503 });
  }
}