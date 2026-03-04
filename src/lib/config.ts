import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface CampsiteConfig {
  stashRoot: string;
}

function configDir(): string {
  return process.env.CAMPSITE_CONFIG_DIR ?? join(homedir(), ".campsite");
}

function configPath(): string {
  return join(configDir(), "config.json");
}

function resolveHome(p: string): string {
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

export function loadConfig(): CampsiteConfig {
  const path = configPath();
  const dir = configDir();
  if (existsSync(path)) {
    try {
      const raw = JSON.parse(readFileSync(path, "utf-8"));
      return { stashRoot: resolveHome(raw.stashRoot ?? dir) };
    } catch {
      // Corrupt config — fall through to defaults
    }
  }
  return { stashRoot: dir };
}

export function saveConfig(partial: Partial<CampsiteConfig>): void {
  const dir = configDir();
  const resolved = { ...partial };
  if (resolved.stashRoot) resolved.stashRoot = resolveHome(resolved.stashRoot);
  const merged = { ...loadConfig(), ...resolved };
  mkdirSync(dir, { recursive: true });
  writeFileSync(configPath(), JSON.stringify(merged, null, 2));
}

export function configExists(): boolean {
  return existsSync(configPath());
}

export function getStashRoot(): string {
  return process.env.CAMPSITE_STASH_ROOT ?? loadConfig().stashRoot;
}
