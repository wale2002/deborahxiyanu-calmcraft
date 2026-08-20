import { NextResponse } from "next/server";
import {
  cloudinaryConfig,
  sanitizeContext,
  signCloudinaryParams,
  WEDDING_FOLDER,
} from "../../../lib/cloudinary";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const config = cloudinaryConfig();
  if (!config) return NextResponse.json({ error: "Uploads are being prepared. Please try again shortly." }, { status: 503 });

  let body: { guestName?: string; message?: string; moment?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const guestName = sanitizeContext(body.guestName, 80);
  if (!guestName) return NextResponse.json({ error: "A guest name is required" }, { status: 400 });
  const message = sanitizeContext(body.message, 300);
  const moment = sanitizeContext(body.moment, 80) || "The celebration";
  const timestamp = Math.floor(Date.now() / 1000);
  const context = `guest_name=${guestName}|message=${message}|moment=${moment}`;
  const tags = "deborah-iyanu,wedding-guest";
  const params = {
    context,
    folder: WEDDING_FOLDER,
    tags,
    timestamp,
    upload_preset: config.uploadPreset,
  };
  const signature = await signCloudinaryParams(params, config.apiSecret);
  return NextResponse.json(
    {
      cloudName: config.cloudName,
      apiKey: config.apiKey,
      timestamp,
      signature,
      uploadPreset: config.uploadPreset,
      folder: WEDDING_FOLDER,
      tags,
      context,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
