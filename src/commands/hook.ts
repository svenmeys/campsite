/**
 * campsite hook — Output or install the session-start hook.
 *
 * The hook runs at the start of every Claude Code session,
 * injecting your latest trail map (working context) and camp status.
 * Like checking the trail register before starting your hike.
 *
 * Usage:
 *   campsite hook             # Output the hook script
 *   campsite hook --install   # Install into Claude Code settings
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

function getHookSource(): string {
  // Resolve from package root (two levels up from src/commands/)
  const pkgRoot = join(dirname(import.meta.dir), "..");
  return join(pkgRoot, "hooks", "session-start.sh");
}

export function hook(args: string[]): void {
  if (args.includes("--install")) {
    installHook();
    return;
  }

  const source = getHookSource();
  if (!existsSync(source)) {
    console.error(`Hook source not found at ${source}`);
    process.exit(1);
  }
  console.log(readFileSync(source, "utf-8"));
}

function writeHookScript(): string {
  const hookDir = join(homedir(), ".claude", "hooks");
  const hookPath = join(hookDir, "campsite-session-start.sh");
  const source = getHookSource();

  if (!existsSync(source)) {
    console.error(`Hook source not found at ${source}`);
    process.exit(1);
  }

  mkdirSync(hookDir, { recursive: true });
  const content = readFileSync(source, "utf-8");
  writeFileSync(hookPath, content, { mode: 0o755 });
  console.log(`Hook written to ${hookPath}`);
  return hookPath;
}

function addHookToSettings(hookPath: string): void {
  const settingsPath = join(homedir(), ".claude", "settings.json");

  if (!existsSync(settingsPath)) {
    console.log("\nNo Claude Code settings.json found. Add manually:");
    printSettingsSnippet(hookPath);
    return;
  }

  const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
  const existingHooks = settings.hooks?.SessionStart?.[0]?.hooks ?? [];
  const alreadyInstalled = existingHooks.some(
    (h: { command?: string }) => h.command?.includes("campsite")
  );

  if (alreadyInstalled) {
    console.log("Hook already installed in settings.json");
    return;
  }

  settings.hooks ??= {};
  settings.hooks.SessionStart ??= [{ hooks: [] }];
  settings.hooks.SessionStart[0].hooks ??= [];
  settings.hooks.SessionStart[0].hooks.push({ type: "command", command: hookPath });

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  console.log("Hook added to Claude Code settings.json");
  console.log("\nRestart Claude Code to activate.");
}

function installHook(): void {
  const hookPath = writeHookScript();
  addHookToSettings(hookPath);
}

function printSettingsSnippet(hookPath: string): void {
  const snippet = [
    "{",
    '  "hooks": {',
    '    "SessionStart": [{',
    '      "hooks": [{',
    '        "type": "command",',
    `        "command": "${hookPath}"`,
    "      }]",
    "    }]",
    "  }",
    "}",
  ].join("\n");
  console.log(snippet);
}
