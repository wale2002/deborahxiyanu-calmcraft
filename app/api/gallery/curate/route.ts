import { NextResponse } from "next/server";
import { setMagazineSelection } from "../../../lib/cloudinary";
import { hasGallerySession } from "../../../lib/gallery-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await hasGallerySession())) return NextResponse.json({ error: "Authorisation required" }, { status: 401 });
  let body: { publicId?: string; resourceType?: string; selected?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (
    typeof body.publicId !== "string" ||
    (body.resourceType !== "image" && body.resourceType !== "video") ||
    typeof body.selected !== "boolean"
  ) return NextResponse.json({ error: "Invalid selection" }, { status: 400 });
  try {
    await setMagazineSelection(body.publicId, body.resourceType, body.selected);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not update the magazine shortlist." }, { status: 503 });
  }
}
