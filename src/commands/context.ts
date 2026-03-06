import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stashPath, getRepoName, ensureStash } from "../lib/stash.ts";
import { nextSession, sessionFilename } from "../lib/session.ts";
import { flagValue, readStdin } from "../lib/args.ts";

export async function context(args: string[]): Promise<void> {
  const json = args.includes("--json");

  // --file flag → write
  const filePath = flagValue(args, "--file");
  if (filePath) return writeContext(readFileSync(filePath, "utf-8"));

  // Explicit stdin: campsite context -
  if (args.includes("-")) return writeContext(await readStdin());

  // Inline text → write: campsite context "some text here"
  const text = args.filter((a) => !a.startsWith("--")).join(" ").trim();
  if (text) return writeContext(text);

  // No args → read
  return readContext(json);
}

function readContext(json: boolean): void {
  const repoName = getRepoName();
  const dir = stashPath("working-context", repoName);
  if (!existsSync(dir)) {
    if (json) {
      console.log(JSON.stringify({ repo: repoName, exists: false, file: null, content: null }, null, 2));
      return;
    }
    console.log("No context yet. Write one at session end.");
    return;
  }

  const latest = readdirSync(dir).filter((f) => f.endsWith(".md")).sort().at(-1);
  if (!latest) {
    if (json) {
      console.log(JSON.stringify({ repo: repoName, exists: false, file: null, content: null }, null, 2));
      return;
    }
    console.log("No context yet. Write one at session end.");
    return;
  }

  const file = join(dir, latest);
  const content = readFileSync(file, "utf-8");
  if (json) {
    console.log(JSON.stringify({ repo: repoName, exists: true, file, content }, null, 2));
    return;
  }
  process.stdout.write(content);
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
