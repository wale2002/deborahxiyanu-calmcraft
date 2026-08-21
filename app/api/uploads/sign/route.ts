import { NextResponse } from "next/server";
import {
  cloudinaryUploadConfig,
  WEDDING_FOLDER,
} from "../../../lib/cloudinary";

export const dynamic = "force-dynamic";

export async function POST() {
  const config = cloudinaryUploadConfig();
  if (!config) return NextResponse.json({ error: "Uploads are being prepared. Please try again shortly." }, { status: 503 });
  const tags = "deborah-iyanu,wedding-guest";
  return NextResponse.json(
    {
      cloudName: config.cloudName,
      uploadPreset: config.uploadPreset,
      folder: WEDDING_FOLDER,
      tags,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
