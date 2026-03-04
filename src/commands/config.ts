import { loadConfig, saveConfig } from "../lib/config.ts";

const VALID_KEYS = ["stashRoot"] as const;
type ConfigKey = (typeof VALID_KEYS)[number];

export function config(args: string[]): void {
  const [key, ...rest] = args;

  if (!key) {
    const cfg = loadConfig();
    console.log(`stashRoot: ${cfg.stashRoot}`);
    return;
  }

  if (!VALID_KEYS.includes(key as ConfigKey)) {
    console.error(`Unknown key: ${key}. Valid: ${VALID_KEYS.join(", ")}`);
    process.exit(1);
  }

  const value = rest.join(" ").trim();
  if (!value) {
    console.log(loadConfig()[key as ConfigKey]);
    return;
  }

  saveConfig({ [key]: value });
  console.log(`${key} = ${value}`);
}
