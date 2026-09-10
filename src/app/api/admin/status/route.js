import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request) {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;
  return Response.json({ authorized: true });
}
