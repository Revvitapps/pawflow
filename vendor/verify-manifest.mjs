// Verifies every vendored @revvitapps/* file matches the checksum recorded in
// MANIFEST.json — catches accidental or malicious drift between what's
// documented as vendored and what's actually sitting in vendor/. Run it locally
// via `node vendor/verify-manifest.mjs`. The core check (`verifyManifest`) is a
// pure function of (manifest, baseDir) so it stays trivially testable.
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

/**
 * @param {object} manifest - parsed MANIFEST.json
 * @param {string} baseDir - directory MANIFEST.json lives in (package dirs are resolved relative to it)
 * @returns {{ checked: number, errors: string[] }}
 */
export function verifyManifest(manifest, baseDir) {
  const errors = [];
  let checked = 0;

  for (const pkg of manifest.packages) {
    const pkgDir = path.join(baseDir, pkg.name.replace("@revvitapps/", "revvitapps-"));
    for (const [relPath, expectedHash] of Object.entries(pkg.files)) {
      const fullPath = path.join(pkgDir, relPath);
      checked++;
      if (!existsSync(fullPath)) {
        errors.push(`${pkg.name}/${relPath} is listed in MANIFEST.json but does not exist on disk.`);
        continue;
      }
      const actualHash = sha256(fullPath);
      if (actualHash !== expectedHash) {
        errors.push(`${pkg.name}/${relPath} checksum mismatch.\n  expected: ${expectedHash}\n  actual:   ${actualHash}`);
      }
    }
  }

  return { checked, errors };
}

function isMainModule() {
  return process.argv[1] !== undefined && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

if (isMainModule()) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const manifestPath = path.join(here, "MANIFEST.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

  const { checked, errors } = verifyManifest(manifest, here);

  if (errors.length > 0) {
    for (const message of errors) console.error(`FAIL: ${message}`);
    console.error(`\n${errors.length}/${checked} vendored file(s) failed checksum verification.`);
    process.exit(1);
  }

  const provenance = manifest.packages
    .map((pkg) => `${pkg.name}@${pkg.sourceCommit ?? manifest.sourceCommit}`)
    .join(", ");
  console.log(`PASS: all ${checked} vendored files match MANIFEST.json (${manifest.sourceRepository} — ${provenance}).`);
}
