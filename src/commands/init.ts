import { getRepoName, ensureStash } from "../lib/stash.ts";
import { configExists, saveConfig, loadConfig } from "../lib/config.ts";

const DEFAULT_STASH = "~/.campsite";

async function prompt(question: string): Promise<string> {
  process.stdout.write(question);
  for await (const line of console) {
    return line;
  }
  return "";
}

async function firstRunSetup(): Promise<void> {
  console.log("🏕️  First time setup!\n");
  console.log("Where should campsite store your data?\n");
  console.log(`  Press enter for default (${DEFAULT_STASH})`);
  console.log("  Or type a path: ~/vault, /data/campsite, etc.\n");

  const answer = (await prompt("> ")).trim();
  const stashRoot = answer || DEFAULT_STASH;

  saveConfig({ stashRoot });
  console.log(`\n📍 Stash root: ${loadConfig().stashRoot}\n`);
}

export async function init(): Promise<void> {
  if (!configExists()) {
    await firstRunSetup();
  }

  const repo = getRepoName();
  const dir = ensureStash(repo);

  console.log(`⛺ Stash ready for "${repo}"`);
  console.log(`   ${dir}`);
  console.log("");
  console.log("  journal/          Session journals");
  console.log("  working-context/  Context maps");
  console.log("  plans/            Plans + side quest files");
  console.log("  backlog.md        Side quest log");
}
