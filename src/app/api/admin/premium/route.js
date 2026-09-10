import { requireAdmin } from "@/lib/admin-auth";
import { errorResponse, readJson } from "@/lib/api";
import { getPremiumConfig, savePremiumConfig } from "@/lib/premium-store";

export async function GET(request) {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;
  return Response.json({ config: await getPremiumConfig() });
}

export async function PATCH(request) {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;
  try {
    const input = await readJson(request);
    const config = await savePremiumConfig(input);
    return Response.json({ config });
  } catch (error) {
    return errorResponse(error);
  }
}
