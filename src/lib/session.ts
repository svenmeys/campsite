import { readdirSync, existsSync } from "node:fs";
import { stashPath } from "./stash.ts";

/** Today's date as YYYY-MM-DD in local timezone */
export function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Current time as HH:MM in local timezone */
export function timeNow(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Next session number for today in the given subdirectory */
export function nextSession(subdir: string, repo?: string): number {
  const dir = stashPath(subdir, repo);
  if (!existsSync(dir)) return 1;

  const prefix = `${today()}-S`;
  const latest = readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".md"))
    .map((f) => Number(f.slice(prefix.length, -3)))
    .filter((n) => Number.isInteger(n) && n > 0)
    .reduce((max, n) => Math.max(max, n), 0);

  return latest + 1;
}

/** Build session filename: YYYY-MM-DD-S{N}.md */
export function sessionFilename(sessionNum: number, date?: string): string {
  return `${date ?? today()}-S${sessionNum}.md`;
}
