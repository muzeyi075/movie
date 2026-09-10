import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getBackblazeClient, getBucketName, getPublicBaseUrl } from "@/lib/backblaze";
import { errorResponse, rateLimit, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";

const allowedTypes = new Set(["video/mp4", "video/webm", "video/quicktime", "image/jpeg", "image/png", "image/webp"]);

export async function POST(request) {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;
  try {
    const blocked = rateLimit(request, 10); if (blocked) return blocked;
    const { filename, contentType, size } = await readJson(request);
    if (typeof filename !== "string" || !filename.trim()) return Response.json({ error: "filename is required." }, { status: 400 });
    if (!allowedTypes.has(contentType)) return Response.json({ error: "Unsupported media type." }, { status: 400 });
    const maxBytes = contentType.startsWith("video/") ? 5 * 1024 * 1024 * 1024 : 10 * 1024 * 1024;
    if (!Number.isFinite(size) || size < 1 || size > maxBytes) return Response.json({ error: `File must be smaller than ${contentType.startsWith("video/") ? "5 GB" : "10 MB"}.` }, { status: 400 });

    const safeName = filename.trim().replace(/[^a-zA-Z0-9._-]/g, "-");
    const key = `movies/${crypto.randomUUID()}-${safeName}`;
    const uploadUrl = await getSignedUrl(getBackblazeClient(), new PutObjectCommand({ Bucket: getBucketName(), Key: key, ContentType: contentType }), { expiresIn: 900 });
    return Response.json({ key, uploadUrl, publicUrl: `${getPublicBaseUrl()}/${key}`, expiresIn: 900 });
  } catch (error) { return errorResponse(error, 500); }
}
