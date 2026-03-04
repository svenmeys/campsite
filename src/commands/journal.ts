import { readFileSync } from "node:fs";
import { join } from "node:path";
import { stashPath, getRepoName, ensureStash } from "../lib/stash.ts";
import { nextSession, sessionFilename } from "../lib/session.ts";
import { flagValue, readStdin } from "../lib/args.ts";

export async function journal(args: string[]): Promise<void> {
  const repo = getRepoName();
  ensureStash(repo);

  const filePath = flagValue(args, "--file");

  let content: string;
  if (filePath) {
    content = readFileSync(filePath, "utf-8");
  } else if (!process.stdin.isTTY) {
    content = await readStdin();
  } else {
    console.error("Pipe content or use --file <path>");
    process.exit(1);
  }

  const sessionNum = nextSession("journal", repo);
  const filename = sessionFilename(sessionNum);
  const outPath = join(stashPath("journal", repo), filename);

  await Bun.write(outPath, content);
  console.log(`📝 ${filename} (S${sessionNum})`);
}
