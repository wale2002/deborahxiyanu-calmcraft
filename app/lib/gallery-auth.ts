import { cookies } from "next/headers";

const COOKIE_NAME = "calmcraft_couple_session";
const SESSION_SECONDS = 12 * 60 * 60;

function encode(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return encode(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

async function digest(value: string) {
  return encode(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

function sessionSecret() {
  return process.env.SESSION_SECRET;
}

export async function validAccessCode(candidate: unknown) {
  const expected = process.env.COUPLE_ACCESS_CODE;
  if (!expected || typeof candidate !== "string") return false;
  return safeEqual(await digest(candidate.trim()), await digest(expected));
}

export async function createGallerySession() {
  const secret = sessionSecret();
  if (!secret) throw new Error("Gallery sessions are not configured");
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const signature = await hmac(String(expires), secret);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${expires}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function clearGallerySession() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
}

export async function hasGallerySession() {
  const secret = sessionSecret();
  if (!secret) return false;
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value || "";
  const [expiresValue, candidate] = value.split(".");
  const expires = Number(expiresValue);
  if (!candidate || !Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  return safeEqual(candidate, await hmac(expiresValue, secret));
}
