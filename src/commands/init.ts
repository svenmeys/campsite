/**
 * campsite init — Pitch your tent.
 *
 * Creates the stash directory structure for the current repo.
 * Like finding a good spot and setting up camp before the hike.
 */

import { pitchTent, getRepoName, stashDir } from "../lib/stash.ts";

export function init(_args: string[]): void {
  const repo = getRepoName();
  const { dir, created } = pitchTent(repo);

  if (created.length === 0) {
    console.log(`Camp already set up at ${dir}`);
    return;
  }

  console.log(`⛺ Camp pitched for "${repo}"`);
  console.log(`   Stash: ${stashDir(repo)}`);
  console.log(`   Created: ${created.length} directories`);
  console.log("");
  console.log("Your gear:");
  console.log("  journal/          Trail logs (session journals)");
  console.log("  working-context/  Trail maps (session handoffs)");
  console.log("  quests/           Route plans (decomposed work)");
  console.log("  plans/            Expedition plans");
  console.log("  outputs/          Summit photos (deliverables)");
  console.log("  backlog.md        Trail markers (side quests)");
}
