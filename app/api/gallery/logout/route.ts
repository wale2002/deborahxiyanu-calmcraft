import { NextResponse } from "next/server";
import { clearGallerySession } from "../../../lib/gallery-auth";

export async function POST() {
  await clearGallerySession();
  return NextResponse.json({ ok: true });
}
