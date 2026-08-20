import { NextResponse } from "next/server";
import { listGalleryAssets } from "../../lib/cloudinary";
import { hasGallerySession } from "../../lib/gallery-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasGallerySession())) return NextResponse.json({ error: "Authorisation required" }, { status: 401 });
  try {
    const assets = await listGalleryAssets();
    return NextResponse.json({ assets }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("not configured")
      ? "The media library is not configured yet."
      : "The gallery could not be loaded right now.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
