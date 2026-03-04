import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const HOOKS_DIR = join(import.meta.dir, "..", "..", "hooks");

const VARIANTS: Record<string, { file: string; desc: string }> = {
  standalone: { file: "session-start.sh", desc: "Standalone (bash + jq, no campsite on PATH needed)" },
  cli: { file: "session-start-cli.sh", desc: "CLI (uses campsite commands, requires campsite on PATH)" },
};

function hookSource(variant: string): string {
  const info = VARIANTS[variant];
  if (!info) {
    console.error(`Unknown variant: ${variant}. Use: standalone, cli`);
    process.exit(1);
  }
  const path = join(HOOKS_DIR, info.file);
  if (!existsSync(path)) {
    console.error(`Hook not found: ${path}`);
    process.exit(1);
  }
  return path;
}

function writeHook(variant: string): string {
  const hookDir = join(homedir(), ".claude", "hooks");
  const hookPath = join(hookDir, "campsite-session-start.sh");
  mkdirSync(hookDir, { recursive: true });
  writeFileSync(hookPath, readFileSync(hookSource(variant), "utf-8"), { mode: 0o755 });
  return hookPath;
}

export function hook(args: string[]): void {
  const variant = args.includes("--cli") ? "cli" : "standalone";

  if (args.includes("--install")) {
    install(variant);
    return;
  }
  console.log(readFileSync(hookSource(variant), "utf-8"));
}

function addToSettings(settingsPath: string, hookPath: string): boolean {
  const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
  const existing = settings.hooks?.SessionStart?.[0]?.hooks ?? [];
  if (existing.some((h: { command?: string }) => h.command?.includes("campsite"))) return false;

  settings.hooks ??= {};
  settings.hooks.SessionStart ??= [{ hooks: [] }];
  settings.hooks.SessionStart[0].hooks ??= [];
  settings.hooks.SessionStart[0].hooks.push({ type: "command", command: hookPath });
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  return true;
}

function install(variant: string): void {
  const hookPath = writeHook(variant);
  const settingsPath = join(homedir(), ".claude", "settings.json");

  if (!existsSync(settingsPath)) {
    console.log(`Hook written to ${hookPath} (${VARIANTS[variant]?.desc})`);
    console.log("\nAdd to ~/.claude/settings.json:");
    console.log(JSON.stringify({
      hooks: { SessionStart: [{ hooks: [{ type: "command", command: hookPath }] }] },
    }, null, 2));
    return;
  }

  if (addToSettings(settingsPath, hookPath)) {
    console.log(`Installed (${variant}). Restart Claude Code to activate.`);
  } else {
    console.log(`Updated to ${variant} variant. Restart Claude Code to activate.`);
  }
}
