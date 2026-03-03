/**
 * campsite backlog — Review your trail markers.
 *
 * Lists all side quests (cairns) captured during focused work.
 * Delegates to sq review — this is a convenience alias.
 *
 * Usage:
 *   campsite backlog        # Same as: campsite sq review
 */

import { sq } from "./sq.ts";

export function backlog(_args: string[]): void {
  sq(["review"]);
}
