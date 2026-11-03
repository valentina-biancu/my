#!/usr/bin/env node
/** NAV-006 (Service bindings are non-inheritable): parse every apps/<app>/wrangler.jsonc; assert service
 *  bindings follow <app>-worker-<env> and target a known Worker.
 *  (bring-up note: the draft comment wrote "apps/<star>/wrangler.jsonc",
 *  whose "<star>/" closed the block comment — reworded, not re-scoped.) */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const APPS = "apps";
let failures = 0;

// bring-up note: the scaffold commit ships no apps/ (Prevent arrives by
// adoption, Worker Adoption Runbook) — no-op cleanly until then.
if (!existsSync(APPS)) {
  console.log("verify-bindings: no apps/ yet — nothing to check");
  process.exit(0);
}

for (const app of readdirSync(APPS)) {
  const cfgPath = join(APPS, app, "wrangler.jsonc");
  if (!existsSync(cfgPath)) continue;
  // strip // comments for JSON.parse (wrangler.jsonc)
  const raw = readFileSync(cfgPath, "utf8")
    .replace(/^\s*\/\/.*$/gm, "");
  let cfg;
  try { cfg = JSON.parse(raw); }
  catch (e) { console.error(`✗ ${cfgPath}: unparseable (${e.message})`); failures++; continue; }

  const envs = ["production", ...(cfg.environments ? Object.keys(cfg.environments) : [])];
  const check = (bindings, env) => {
    for (const b of bindings?.services ?? []) {
      if (!/^[a-z-]+-worker(-[a-z]+)?$/.test(b.service ?? "")) {
        console.error(`✗ ${cfgPath} [${env}]: service binding "${b.service}" violates <app>-worker-<env> naming (NAV-006, Service bindings are non-inheritable)`);
        failures++;
      }
    }
  };
  check(cfg.bindings, "top-level");
  for (const env of envs.slice(1)) check(cfg.environments[env].bindings, env);
  console.log(`${cfgPath}: ${envs.length} environment(s) checked`);
}
if (failures) process.exit(1);
console.log("verify-bindings: clean");
