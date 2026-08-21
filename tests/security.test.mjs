import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("secrets are excluded from the browser upload component", async () => {
  const component = await readFile(new URL("app/components/UploadMoment.tsx", root), "utf8");
  assert.equal(component.includes("CLOUDINARY_API_SECRET"), false);
  assert.equal(component.includes("CLOUDINARY_API_KEY="), false);
});

test("guest uploads require only a selected file", async () => {
  const component = await readFile(new URL("app/components/UploadMoment.tsx", root), "utf8");
  const route = await readFile(new URL("app/api/uploads/sign/route.ts", root), "utf8");
  assert.equal(component.includes("Please tell us your name"), false);
  assert.equal(component.includes("if (!consent)"), false);
  assert.equal(route.includes("A guest name is required"), false);
  assert.equal(route.includes("signature"), false);
  assert.equal(route.includes("apiKey"), false);
});

test("blocked third-party uploads retry through a constrained same-site route", async () => {
  const component = await readFile(new URL("app/components/UploadMoment.tsx", root), "utf8");
  const proxy = await readFile(new URL("app/api/uploads/proxy/route.ts", root), "utf8");
  assert.match(component, /\/api\/uploads\/proxy/);
  assert.match(component, /DirectUploadBlockedError/);
  assert.match(proxy, /PROXY_UPLOAD_LIMIT = 3_500_000/);
  assert.match(proxy, /requestOrigin !== siteOrigin/);
  assert.match(proxy, /ALLOWED_TYPES\.has\(file\.type\)/);
});

test("captions remain optional and are sanitized before storage", async () => {
  const component = await readFile(new URL("app/components/UploadMoment.tsx", root), "utf8");
  const configRoute = await readFile(new URL("app/api/uploads/sign/route.ts", root), "utf8");
  const proxy = await readFile(new URL("app/api/uploads/proxy/route.ts", root), "utf8");
  assert.match(component, /Caption <small>Optional<\/small>/);
  const captionField = component.match(/<textarea[\s\S]*?placeholder="Add the story behind this moment…"[\s\S]*?\/>/)?.[0] || "";
  assert.equal(captionField.includes("required"), false);
  assert.match(configRoute, /sanitizeContext\(body\.caption, 180\)/);
  assert.match(proxy, /sanitizeContext\(incoming\.get\("caption"\), 180\)/);
});

test("gallery sessions use HTTP-only cookies", async () => {
  const auth = await readFile(new URL("app/lib/gallery-auth.ts", root), "utf8");
  assert.match(auth, /httpOnly:\s*true/);
  assert.match(auth, /sameSite:\s*"lax"/);
});

test("repository ignores local environment files but keeps the example", async () => {
  const ignore = await readFile(new URL(".gitignore", root), "utf8");
  assert.match(ignore, /^\.env\*/m);
  assert.match(ignore, /^!\.env\.example/m);
});
