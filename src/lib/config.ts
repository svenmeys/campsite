/**
 * Config — campsite settings.
 *
 * Reads from ~/.campsite/config.json if it exists.
 * Defaults to sensible values when no config is present.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

interface CampsiteConfig {
  /** Root directory for all stash data. Default: ~/.campsite */
  stashRoot: string;
}

const CONFIG_DIR = join(homedir(), ".campsite");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");
const DEFAULT_STASH_ROOT = CONFIG_DIR;

let cached: CampsiteConfig | null = null;

export function loadConfig(): CampsiteConfig {
  if (cached) return cached;

  if (existsSync(CONFIG_PATH)) {
    try {
      const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
      cached = {
        stashRoot: resolveHome(raw.stashRoot ?? DEFAULT_STASH_ROOT),
      };
      return cached;
    } catch {
      // Bad config — use defaults
    }
  }

  cached = { stashRoot: DEFAULT_STASH_ROOT };
  return cached;
}

export function saveConfig(partial: Partial<CampsiteConfig>): void {
  const current = loadConfig();
  const merged = { ...current, ...partial };

  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2));
  cached = merged;
}

export function getStashRoot(): string {
  return loadConfig().stashRoot;
}

function resolveHome(p: string): string {
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}
