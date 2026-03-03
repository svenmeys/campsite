/**
 * Session numbering — each day starts fresh, each session gets S1, S2, S3...
 *
 * Like marking your campsites on a map: Day 1 Camp 1, Day 1 Camp 2, Day 2 Camp 1...
 */

import { readdirSync, existsSync } from "node:fs";
import { stashPath } from "./stash.ts";

/** Get today's date as YYYY-MM-DD */
export function today(): string {
  const d = new Date();
  return d.toISOString().split("T")[0]!;
}

/** Get current time as HH:MM */
export function now(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Count today's sessions in a directory and return the next session number */
export function nextSession(
  subdir: "journal" | "working-context",
  repo?: string
): number {
  const dir = stashPath(subdir, repo);
  if (!existsSync(dir)) return 1;

  const date = today();
  const pattern = `${date}-S`;
  const files = readdirSync(dir).filter(
    (f) => f.startsWith(pattern) && f.endsWith(".md")
  );

  return files.length + 1;
}

/** Build the filename for a session file */
export function sessionFilename(sessionNum: number, date?: string): string {
  return `${date ?? today()}-S${sessionNum}.md`;
}
