#!/usr/bin/env node
/** Records security.test.mjs discipline, ported (NAV-007, Security and secret hygiene).
 *  Fails on live-secret patterns anywhere in the repository. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const PATTERNS = [
  [/sk_live_[A-Za-z0-9]{20,}/, "Stripe live key"],
  [/re_[A-Za-z0-9]{30,}/, "Resend API key"],
  [/-----BEGIN (RSA |EC )?PRIVATE KEY-----/, "private key material"],
  [/pepper\s*[:=]\s*["'][^"']{8,}/i, "session pepper"],
  [/[A-Za-z0-9_-]{40}\.[A-Za-z0-9_-]{14,}\.[A-Za-z0-9_-]{20,}/, "JWT-shaped secret"],
];
// bring-up note: the draft used (?i) inline flags — not valid in JavaScript;
// the /i flag replaces them. Recorded in docs/phase-0/scaffold.md.
const SKIP = new Set([".git", "node_modules", ".next", ".turbo", ".wrangler"]);

let failures = 0;
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|mjs|cjs|json|jsonc|toml|ya?ml|md|html|css|env.*)$/.test(entry) || entry.startsWith(".env")) {
      const text = readFileSync(p, "utf8");
      for (const [re, label] of PATTERNS)
        if (re.test(text)) { console.error(`✗ ${label}: ${p}`); failures++; }
    }
  }
}
walk(".");
if (failures) { console.error(`${failures} secret-pattern hit(s)`); process.exit(1); }
console.log("secrets-grep: clean");
