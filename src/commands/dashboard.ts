import { flagValue } from "../lib/args.ts";
import {
  findDashboardItem,
  formatIssues,
  parseDashboard,
  readDashboardSections,
} from "../lib/planning.ts";

function printDashboardItem(
  item: ReturnType<typeof findDashboardItem> extends infer T ? Exclude<T, undefined> : never,
  brief: boolean,
): void {
  const box = item.done ? "x" : " ";
  const summary = item.summary ? ` -- ${item.summary}` : "";
  console.log(`- [${box}] [${item.id}] ${item.title}${summary}`);
  if (brief) return;

  const keys = Object.keys(item.metadata).sort();
  for (const key of keys) {
    console.log(`  - ${key}: ${item.metadata[key]}`);
  }
}

function printDashboardSummary(args: string[]): void {
  const json = args.includes("--json");
  const brief = args.includes("--brief");
  const sectionId = flagValue(args, "--section");
  const doc = parseDashboard();

  if (doc.issues.length > 0) {
    console.error(formatIssues(doc.issues));
    process.exit(1);
  }

  const sections = readDashboardSections(doc, sectionId);
  if (sectionId && sections.length === 0) {
    console.error(`Unknown dashboard section: ${sectionId}`);
    process.exit(1);
  }

  if (json) {
    console.log(JSON.stringify({
      title: doc.title,
      updated: doc.updated,
      sections,
    }, null, 2));
    return;
  }

  console.log(`# ${doc.title}`);
  if (doc.updated) console.log(`Updated: ${doc.updated}`);
  console.log("");

  for (const section of sections) {
    const heading = section.depth === 2 ? "##" : "###";
    console.log(`${heading} ${section.title} (${section.id})`);
    if (section.items.length === 0) {
      console.log("(no tracked items)");
      console.log("");
      continue;
    }

    for (const item of section.items) {
      printDashboardItem(item, brief);
    }
    console.log("");
  }
}

function printDashboardItemCommand(args: string[]): void {
  const itemId = args[1];
  if (!itemId) {
    console.error("Usage: campsite dashboard item <DB-id> [--json]");
    process.exit(1);
  }

  const json = args.includes("--json");
  const doc = parseDashboard();
  if (doc.issues.length > 0) {
    console.error(formatIssues(doc.issues));
    process.exit(1);
  }

  const item = findDashboardItem(doc, itemId);
  if (!item) {
    console.error(`Unknown dashboard item: ${itemId}`);
    process.exit(1);
  }

  const section = doc.sections.find((entry) => entry.id === item.sectionId);
  if (json) {
    console.log(JSON.stringify({
      ...item,
      section,
    }, null, 2));
    return;
  }

  console.log(`[${item.done ? "x" : " "}] ${item.id} ${item.title}`);
  if (item.summary) console.log(item.summary);
  if (section) console.log(`Section: ${section.title} (${section.id})`);

  const keys = Object.keys(item.metadata).sort();
  for (const key of keys) {
    console.log(`${key}: ${item.metadata[key]}`);
  }
}

function lintDashboardCommand(): void {
  const doc = parseDashboard();
  if (doc.issues.length > 0) {
    console.error(formatIssues(doc.issues));
    process.exit(1);
  }

  console.log("✅ DASHBOARD.md is valid");
}

export function dashboard(args: string[]): void {
  const subcommand = args[0];

  if (subcommand === "lint") return lintDashboardCommand();
  if (subcommand === "show") return printDashboardSummary(args.slice(1));
  if (subcommand === "item") return printDashboardItemCommand(args);

  console.error("Usage: campsite dashboard <lint|show|item> [options]");
  process.exit(1);
}
