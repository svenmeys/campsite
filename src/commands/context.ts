import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stashPath, getRepoName, ensureStash } from "../lib/stash.ts";
import { nextSession, sessionFilename } from "../lib/session.ts";
import { flagValue, readStdin } from "../lib/args.ts";

export async function context(args: string[]): Promise<void> {
  // --file flag → write
  const filePath = flagValue(args, "--file");
  if (filePath) return writeContext(readFileSync(filePath, "utf-8"));

  // Explicit stdin: campsite context -
  if (args.includes("-")) return writeContext(await readStdin());

  // Inline text → write: campsite context "some text here"
  const text = args.filter((a) => !a.startsWith("--")).join(" ").trim();
  if (text) return writeContext(text);

  // No args → read
  return readContext();
}

function readContext(): void {
  const dir = stashPath("working-context", getRepoName());
  if (!existsSync(dir)) {
    console.log("No context yet. Write one at session end.");
    return;
  }

  const latest = readdirSync(dir).filter((f) => f.endsWith(".md")).sort().at(-1);
  if (!latest) {
    console.log("No context yet. Write one at session end.");
    return;
  }

  process.stdout.write(readFileSync(join(dir, latest), "utf-8"));
}

async function writeContext(content: string): Promise<void> {
  const repo = getRepoName();
  ensureStash(repo);

  const sessionNum = nextSession("working-context", repo);
  const filename = sessionFilename(sessionNum);
  const outPath = join(stashPath("working-context", repo), filename);

  await Bun.write(outPath, content);
  console.log(`🗺️  ${filename} (S${sessionNum})`);
}
