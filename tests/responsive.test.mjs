import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("mobile pages use a device-width viewport and phone safe areas", async () => {
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  const styles = await readFile(new URL("app/globals.css", root), "utf8");

  assert.match(layout, /width: "device-width"/);
  assert.match(layout, /viewportFit: "cover"/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.match(styles, /height: 100dvh/);
});

test("phone gallery cards keep every action reachable", async () => {
  const styles = await readFile(new URL("app/globals.css", root), "utf8");

  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*?\.mediaGrid \{ columns: 1;/);
  assert.match(styles, /\.mediaButtons button:first-child \{ grid-column: 1 \/ -1; \}/);
  assert.match(styles, /\.mediaButtons button, \.mediaButtons a \{ min-height: 42px;/);
});

test("narrow phone content can shrink without horizontal overflow", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const styles = await readFile(new URL("app/globals.css", root), "utf8");

  assert.match(page, /<main className="homePage">/);
  assert.match(styles, /\.queueItem > div \{ min-width: 0; \}/);
  assert.match(styles, /@media \(max-width: 380px\)/);
  assert.match(styles, /overflow-x: hidden/);
});
