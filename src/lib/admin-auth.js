const adminPassword = process.env.ADMIN_PASSWORD?.trim() || "";

export function getAdminPassword() {
  return adminPassword;
}

export function isAdminAuthenticated(request) {
  const cookieHeader = request.headers.get("cookie") || "";
  return cookieHeader.split(";").some((cookie) => cookie.trim() === "admin-auth=true");
}

export function requireAdmin(request) {
  if (!isAdminAuthenticated(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
