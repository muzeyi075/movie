export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

export function errorResponse(error, status = 400) {
  return Response.json({ error: error instanceof Error ? error.message : "Request could not be processed." }, { status });
}

const requests = new Map();
export function rateLimit(request, limit = 20, windowMs = 60_000) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now(); const record = requests.get(address);
  if (!record || now - record.startedAt > windowMs) { requests.set(address, { startedAt: now, count: 1 }); return null; }
  record.count += 1;
  if (record.count > limit) return Response.json({ error: "Too many requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(Math.ceil((windowMs - (now - record.startedAt)) / 1000)) } });
  return null;
}
