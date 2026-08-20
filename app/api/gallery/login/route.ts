import { NextResponse } from "next/server";
import { createGallerySession, validAccessCode } from "../../../lib/gallery-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!(await validAccessCode(body.code))) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return NextResponse.json({ error: "That access code is not recognised." }, { status: 401 });
  }
  try {
    await createGallerySession();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "The private gallery is not configured yet." }, { status: 503 });
  }
}
