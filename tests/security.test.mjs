import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("secrets are excluded from the browser upload component", async () => {
  const component = await readFile(new URL("app/components/UploadMoment.tsx", root), "utf8");
  assert.equal(component.includes("CLOUDINARY_API_SECRET"), false);
  assert.equal(component.includes("CLOUDINARY_API_KEY="), false);
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
