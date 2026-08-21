import { NextResponse } from "next/server";
import { deleteGalleryAsset, listGalleryAssets } from "../../lib/cloudinary";
import { hasGallerySession } from "../../lib/gallery-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasGallerySession())) {
    return NextResponse.json(
      { authenticated: false, assets: [] },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }
  try {
    const assets = await listGalleryAssets();
    return NextResponse.json(
      { authenticated: true, assets },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error && error.message.includes("not configured")
      ? "The media library is not configured yet."
      : "The gallery could not be loaded right now.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!(await hasGallerySession())) {
    return NextResponse.json({ error: "Authorisation required" }, { status: 401 });
  }

  let body: { publicId?: unknown; resourceType?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid delete request" }, { status: 400 });
  }

  const publicId = typeof body.publicId === "string" ? body.publicId : "";
  const resourceType = body.resourceType;
  if (!publicId || (resourceType !== "image" && resourceType !== "video")) {
    return NextResponse.json({ error: "Invalid gallery asset" }, { status: 400 });
  }

  try {
    await deleteGalleryAsset(publicId, resourceType);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const message = error instanceof Error && error.message === "Invalid asset"
      ? "Invalid gallery asset"
      : "The moment could not be deleted right now.";
    const status = message === "Invalid gallery asset" ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
