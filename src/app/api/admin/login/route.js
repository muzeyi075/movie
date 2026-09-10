import { getAdminPassword } from "@/lib/admin-auth";

export async function POST(request) {
  const input = await request.json();
  const password = String(input.password || "");
  const adminPassword = getAdminPassword();

  if (!adminPassword) {
    return Response.json({ error: "Admin password is not configured." }, { status: 500 });
  }

  if (password !== adminPassword) {
    return Response.json({ error: "Incorrect password." }, { status: 401 });
  }

  const response = new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Set-Cookie": `admin-auth=true; Path=/; HttpOnly; ${process.env.NODE_ENV === "production" ? "Secure; " : ""}SameSite=Strict; Max-Age=${60 * 60 * 24}`,
      "Content-Type": "application/json",
    },
  });

  return response;
}
