import { NextResponse } from "next/server";
import {
  cloudinaryUploadConfig,
  sanitizeContext,
  WEDDING_FOLDER,
} from "../../../lib/cloudinary";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const config = cloudinaryUploadConfig();
  if (!config) return NextResponse.json({ error: "Uploads are being prepared. Please try again shortly." }, { status: 503 });
  let caption = "";
  try {
    const body = (await request.json()) as { caption?: unknown };
    caption = sanitizeContext(body.caption, 180);
  } catch {
    // Caption is optional, including for older clients that send no body.
  }
  const tags = "deborah-iyanu,wedding-guest";
  return NextResponse.json(
    {
      cloudName: config.cloudName,
      uploadPreset: config.uploadPreset,
      folder: WEDDING_FOLDER,
      tags,
      ...(caption ? { context: `message=${caption}` } : {}),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
