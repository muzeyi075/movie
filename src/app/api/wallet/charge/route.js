import { connectMongoose } from "@/lib/mongoose";
import User from "@/models/User";
import Deposit from "@/models/Deposit";
import { authenticateRequest, getUserId, unauthorizedResponse } from "@/lib/auth";

export async function POST(request) {
  try {
    const decoded = await authenticateRequest(request);
    if (!decoded) return unauthorizedResponse();
    const userId = getUserId(decoded);
    if (!userId) return unauthorizedResponse();

    const { movieId, amount } = await request.json();
    if (!movieId || !amount || amount <= 0) {
      return Response.json({ error: "movieId and amount (positive number) are required" }, { status: 400 });
    }

    await connectMongoose();

    // Get user with wallet
    const user = await User.findOne({ userId });
    if (!user?.walletAddress) {
      return Response.json({ error: "No wallet linked to this account" }, { status: 400 });
    }

    // Get finalized deposits for the user
    const deposits = await Deposit.find({
      userId,
      status: "finalized"
    }).sort({ createdAt: -1 });

    if (deposits.length === 0) {
      return Response.json({ error: "No available funds in your wallet" }, { status: 400 });
    }

    // Calculate available balance
    let availableBalance = 0;
    for (const deposit of deposits) {
      const remaining = deposit.amount - (deposit.spentAmount || 0);
      availableBalance += remaining;
    }

    if (availableBalance < amount) {
      return Response.json({ error: `Insufficient balance. Available: ${availableBalance.toFixed(6)} SOL, Required: ${amount.toFixed(6)} SOL` }, { status: 400 });
    }

    // Deduct from deposits (FIFO - oldest first)
    let amountToDeduct = amount;
    const charges = [];

    for (const deposit of deposits) {
      if (amountToDeduct <= 0) break;

      const remaining = deposit.amount - (deposit.spentAmount || 0);
      const chargeAmount = Math.min(remaining, amountToDeduct);

      if (chargeAmount > 0) {
        await Deposit.updateOne(
          { _id: deposit._id },
          { $inc: { spentAmount: chargeAmount } }
        );
        charges.push({ depositId: deposit._id.toString(), amount: chargeAmount });
        amountToDeduct -= chargeAmount;
      }
    }

    // Update user's available balance
    const newBalance = availableBalance - amount;
    await User.updateOne({ userId }, { walletBalance: newBalance });

    return Response.json({
      success: true,
      charged: amount,
      remaining: newBalance,
      charges
    });
  } catch (error) {
    console.error("Charge error:", error);
    return Response.json({ error: error.message || "Charge failed" }, { status: 500 });
  }
}
