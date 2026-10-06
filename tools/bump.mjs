#!/usr/bin/env node
// Version bump to the Workgroup convention (not semver): node tools/bump.mjs patch|minor|major [--dry]
//   - third digit: every commit (pre-commit hook); second: notable change; first: when called for
//   - every digit below the first runs 0..24, then carries into the one above (1.2.24 -> 1.3.0)
//   - a tag is not a bump
// Updates every package.json in the repo (found by glob) and, for this app, the service worker's
// cache name so phones pick up each release. On a carry or an explicit minor/major, adds a dated
// CHANGELOG.md heading.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const CAP = 24; // highest value of each digit below the first

// The carry as one pure function over the whole triple, so patch and minor can't carry differently.
export function bump([major, minor, patch], kind) {
  if (kind === "major") return [major + 1, 0, 0];
  if (kind === "minor") { minor += 1; patch = 0; }
  else if (kind === "patch") patch += 1;
  else throw new Error(`Unknown bump kind: ${kind}`);
  if (patch > CAP) { patch = 0; minor += 1; }
  if (minor > CAP) { minor = 0; major += 1; }
  return [major, minor, patch];
}

export const parse = (v) => {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v).trim());
  if (!m) throw new Error(`Not a version: ${v}`);
  return m.slice(1).map(Number);
};

// Every package.json under the repo root, skipping node_modules and .git.
export function findPackageJsons(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findPackageJsons(p));
    else if (entry.name === "package.json") out.push(p);
  }
  return out;
}

const runAsScript = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (runAsScript) {
  const kind = process.argv[2];
  const dry = process.argv.includes("--dry");
  const root = resolve(fileURLToPath(import.meta.url), "..", "..");
  const files = findPackageJsons(root);
  if (!files.length) { console.error("No package.json found"); process.exit(1); }
  const rootPkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const from = parse(rootPkg.version);
  const to = bump(from, kind);
  const fromS = from.join("."), toS = to.join(".");
  const carried = kind === "patch" && to[2] === 0;
  console.log(`${fromS} -> ${toS}${carried ? " (carried)" : ""}${dry ? " [dry run, nothing written]" : ""}`);
  if (dry) process.exit(0);
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    writeFileSync(f, text.replace(/("version"\s*:\s*")[^"]*(")/, `$1${toS}$2`));
    console.log(`  updated ${relative(root, f)}`);
  }
  // This app: the service worker's cache name carries the version, so each release replaces the cache.
  const sw = join(root, "sw.js");
  if (existsSync(sw)) {
    writeFileSync(sw, readFileSync(sw, "utf8").replace(/const CACHE = "[^"]*";/, `const CACHE = "dignitynotes-${toS}";`));
    console.log("  updated sw.js");
  }
  if (carried || kind !== "patch") {
    const log = join(root, "CHANGELOG.md");
    const date = new Date().toISOString().slice(0, 10);
    const old = existsSync(log) ? readFileSync(log, "utf8") : "# Changelog\n";
    const [head, ...rest] = old.split("\n");
    writeFileSync(log, [head, "", `## ${toS} - ${date}`, "", ...rest].join("\n").replace(/\n{3,}/g, "\n\n"));
    console.log(`  CHANGELOG.md: added heading ${toS}`);
  }
}
