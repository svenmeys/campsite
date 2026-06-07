import { readFileSync } from "node:fs";
import { join } from "node:path";
import { stashPath, getRepoName, ensureStash } from "../lib/stash.ts";
import { nextSession, sessionFilename, today } from "../lib/session.ts";
import { flagValue, readStdin } from "../lib/args.ts";
import { ensureSessionFrontmatter } from "../lib/frontmatter.ts";
import type { FrontmatterExtra } from "../lib/frontmatter.ts";

function parseList(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

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

  const extra: FrontmatterExtra = {
    project: flagValue(args, "--project"),
    domain: parseList(flagValue(args, "--domain")),
    tags: parseList(flagValue(args, "--tags")),
    summary: flagValue(args, "--summary"),
  };

  const sessionNum = nextSession("journal", repo);
  const filename = sessionFilename(sessionNum);
  const date = today();
  const output = ensureSessionFrontmatter(content, { kind: "Journal", repo, date, session: sessionNum }, extra);
  const outPath = join(stashPath("journal", repo), filename);

  await Bun.write(outPath, output);
  console.log(`📝 ${filename} (S${sessionNum})`);
}
