import { NextResponse } from "next/server";
import {
  cloudinaryUploadConfig,
  sanitizeContext,
  WEDDING_FOLDER,
} from "../../../lib/cloudinary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PROXY_UPLOAD_LIMIT = 3_500_000;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export async function POST(request: Request) {
  const requestOrigin = request.headers.get("origin");
  const siteOrigin = new URL(request.url).origin;
  if (requestOrigin && requestOrigin !== siteOrigin) {
    return NextResponse.json({ error: "Upload origin not allowed." }, { status: 403 });
  }

  const config = cloudinaryUploadConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Uploads are being prepared. Please try again shortly." },
      { status: 503 },
    );
  }

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return NextResponse.json({ error: "The selected file could not be read." }, { status: 400 });
  }

  const file = incoming.get("file");
  const caption = sanitizeContext(incoming.get("caption"), 180);
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a photo or video first." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "This file type is not supported." }, { status: 415 });
  }
  if (file.size > PROXY_UPLOAD_LIMIT) {
    return NextResponse.json(
      { error: "Open this page in Chrome or Safari to send this larger file." },
      { status: 413 },
    );
  }

  const outbound = new FormData();
  outbound.append("file", file, file.name);
  outbound.append("upload_preset", config.uploadPreset);
  outbound.append("folder", WEDDING_FOLDER);
  outbound.append("tags", "deborah-iyanu,wedding-guest");
  if (caption) outbound.append("context", `message=${caption}`);

  let response: Response;
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/auto/upload`,
      { method: "POST", body: outbound },
    );
  } catch {
    return NextResponse.json(
      { error: "The photo service is temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }

  const responseBody = await response.text();
  return new Response(responseBody, {
    status: response.status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": response.headers.get("content-type") || "application/json",
    },
  });
}
