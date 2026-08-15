import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { ROOT_FOLDER_ID, ROOT_TITLE, summarizeRaw, topLevelFolders } from "../scripts/archive-tools.mjs";

const raw = JSON.parse(await fs.readFile(new URL("../app/data/archive.generated.json", import.meta.url), "utf8"));

test("snapshot contains a consistent recursive Drive tree", () => {
  assert.equal(raw.sourceFolderId, ROOT_FOLDER_ID);
  const summary = summarizeRaw(raw);
  assert.equal(summary.nodes, summary.folders + summary.files);
  assert.equal(new Set(raw.nodes.map((node) => node.id)).size, summary.nodes);
  assert.ok(summary.topFolders > 0);
  assert.ok(summary.yearFolders > 0);
  assert.ok(summary.subtitles > 0);
  assert.ok(raw.nodes.every((node) => Array.isArray(node.path) && node.path[0] === ROOT_TITLE));
});

test("top-level folders remain data-driven for automatic category tiles", () => {
  const top = topLevelFolders(raw);
  assert.ok(top.some((folder) => folder.name === "2026"));
  assert.ok(top.some((folder) => folder.name.includes("Weekly Idol")));
  assert.ok(top.some((folder) => folder.name.includes("Qn ASMR")));
  assert.ok(top.some((folder) => folder.name.includes("General Meeting")));
});

test("subtitle folders contain episode-linked files", () => {
  const subtitles = raw.nodes.filter((node) => /\.(srt|vtt|ass)$/iu.test(node.name));
  assert.ok(subtitles.some((node) => /EP\.?\s*1|제\s*1회/iu.test(node.name)));
  assert.ok(subtitles.every((node) => node.type === "file"));
});
