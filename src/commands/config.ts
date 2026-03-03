/**
 * campsite config — View or update campsite settings.
 *
 * Usage:
 *   campsite config                          # Show current config
 *   campsite config stashRoot ~/vault        # Set stash root directory
 */

import { loadConfig, saveConfig } from "../lib/config.ts";

const VALID_KEYS = ["stashRoot"] as const;

export function config(args: string[]): void {
  const [key, ...rest] = args;

  if (!key) {
    showConfig();
    return;
  }

  if (!VALID_KEYS.includes(key as (typeof VALID_KEYS)[number])) {
    console.error(`Unknown config key: ${key}`);
    console.error(`Valid keys: ${VALID_KEYS.join(", ")}`);
    process.exit(1);
  }

  const value = rest.join(" ").trim();
  if (!value) {
    const cfg = loadConfig();
    console.log(cfg[key as keyof typeof cfg]);
    return;
  }

  saveConfig({ [key]: value });
  console.log(`Set ${key} = ${value}`);
}

function showConfig(): void {
  const cfg = loadConfig();
  console.log("Campsite config (~/.campsite/config.json):\n");
  console.log(`  stashRoot: ${cfg.stashRoot}`);
}
