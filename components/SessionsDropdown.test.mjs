import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, tsconfigPaths: true });
const { sessionDisplayTitle } = await jiti.import("./SessionsDropdown.tsx");

const source = await readFile(new URL("./SessionsDropdown.tsx", import.meta.url), "utf8");

test("titles sessions by name, first message, then id", () => {
  assert.equal(sessionDisplayTitle({ id: "abc123", firstMessage: "", name: "My session" }), "My session");
  assert.equal(sessionDisplayTitle({ id: "abc123", firstMessage: "Fix the login bug", name: "" }), "Fix the login bug");
  assert.equal(sessionDisplayTitle({ id: "abc123def456", firstMessage: "", name: "" }), "abc123def456");
});

test("filters sessions client-side by title, first message and id", () => {
  assert.match(
    source,
    /sessionDisplayTitle\(session\)\.toLowerCase\(\)\.includes\(q\)\s*\|\|\s*\(session\.firstMessage \?\? ""\)\.toLowerCase\(\)\.includes\(q\)\s*\|\|\s*session\.id\.toLowerCase\(\)\.includes\(q\)/,
  );
  assert.match(source, /const q = query\.trim\(\)\.toLowerCase\(\);/);
  assert.match(source, /if \(!q\) return sessions;/);
});

test("renders a trigger with menu semantics and an activity dot", () => {
  assert.match(source, /aria-haspopup="menu"/);
  assert.match(source, /aria-expanded=\{open\}/);
  assert.match(source, /runningSessionIds\.has\(selected\.id\)/);
  assert.match(source, /unreadSessionIds\.has\(selected\.id\)/);
  assert.match(source, /buttonRef: RefObject<HTMLButtonElement \| null>/);
});

test("renders a scrollable panel with a filter input and empty state", () => {
  assert.match(source, /type="search"/);
  assert.match(source, /autoFocus/);
  assert.match(source, /maxLength=\{200\}/);
  assert.match(source, /placeholder=\{t\("sessions\.search"\)\}/);
  assert.match(source, /maxHeight: "min\(50vh, 380px\)"/);
  assert.match(source, /role="menuitemradio"/);
  assert.match(source, /aria-checked=\{isSelected\}/);
  assert.match(source, /onSelectSession\(session\)/);
  assert.match(source, /t\("sidebar\.noSessions"\)/);
  assert.match(source, /formatRelativeTime\(session\.modified, locale\)/);
});