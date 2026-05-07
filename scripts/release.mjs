#!/usr/bin/env node
/**
 * Usage:
 *   node scripts/release.mjs          # patch (default)
 *   node scripts/release.mjs patch
 *   node scripts/release.mjs minor
 *   node scripts/release.mjs major
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const bump = process.argv[2] ?? "patch";
if (!["patch", "minor", "major"].includes(bump)) {
  console.error(`Invalid bump type: "${bump}". Use patch, minor, or major.`);
  process.exit(1);
}

// 1. Read current version from package.json
const pkgPath = path.join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const [major, minor, patch] = pkg.version.split(".").map(Number);

let nextVersion;
if (bump === "major") nextVersion = `${major + 1}.0.0`;
else if (bump === "minor") nextVersion = `${major}.${minor + 1}.0`;
else nextVersion = `${major}.${minor}.${patch + 1}`;

console.log(`\nBumping ${pkg.version} → ${nextVersion} (${bump})\n`);

// 2. Update package.json
pkg.version = nextVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
console.log("✓ package.json updated");

// 3. Update src/manifest.ts
const manifestPath = path.join(root, "src", "manifest.ts");
let manifest = readFileSync(manifestPath, "utf8");
const updated = manifest.replace(
  /^(const PLUGIN_VERSION = ")[^"]+(";\s*)$/m,
  `$1${nextVersion}$2`,
);
if (updated === manifest) {
  console.error("✗ Could not find PLUGIN_VERSION in src/manifest.ts");
  process.exit(1);
}
writeFileSync(manifestPath, updated, "utf8");
console.log("✓ src/manifest.ts updated");

// 4. Git commit + tag + push
const tag = `v${nextVersion}`;
const run = (cmd) => execSync(cmd, { cwd: root, stdio: "inherit" });

run(`git add package.json src/manifest.ts`);
run(`git commit -m "chore: release ${tag}"`);
run(`git tag ${tag}`);
run(`git push origin main --tags`);

console.log(`\n✓ Released ${tag} — GitHub Actions will publish to npm.\n`);
