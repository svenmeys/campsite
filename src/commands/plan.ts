import { formatIssues, lintPlans, parsePlans, readPlan } from "../lib/planning.ts";

function requirePlanId(args: string[]): string {
  const planId = args[1];
  if (!planId) {
    console.error("Usage: campsite plan show <PLAN-id> [--brief|--json]");
    process.exit(1);
  }
  return planId;
}

function loadValidatedPlan(planId: string) {
  const planDoc = readPlan(process.cwd(), planId);
  if (!planDoc) {
    console.error(`Plan not found: ${planId}`);
    process.exit(1);
  }

  const issues = lintPlans(process.cwd(), planId);
  if (issues.length > 0) {
    console.error(formatIssues(issues));
    process.exit(1);
  }

  return planDoc;
}

function printPlanJson(planDoc: ReturnType<typeof loadValidatedPlan>): void {
  const completed = planDoc.criteria.filter((criterion) => criterion.done).length;
  console.log(JSON.stringify({
    criteria: planDoc.criteria,
    criteriaSummary: {
      completed,
      total: planDoc.criteria.length,
    },
    dashboardIds: planDoc.dashboardIds,
    id: planDoc.id,
    status: planDoc.status,
    ticket: planDoc.ticket,
    title: planDoc.title,
    updated: planDoc.updated,
  }, null, 2));
}

function printPlanText(planDoc: ReturnType<typeof loadValidatedPlan>, brief: boolean): void {
  const completed = planDoc.criteria.filter((criterion) => criterion.done).length;
  console.log(`${planDoc.id}: ${planDoc.title}`);
  if (planDoc.status) console.log(`Status: ${planDoc.status}`);
  if (planDoc.ticket) console.log(`Ticket: ${planDoc.ticket}`);
  if (planDoc.updated) console.log(`Updated: ${planDoc.updated}`);
  if (planDoc.dashboardIds.length > 0) console.log(`Dashboard: ${planDoc.dashboardIds.join(", ")}`);
  console.log(`Acceptance Criteria: ${completed}/${planDoc.criteria.length}`);

  if (brief) return;

  console.log("");
  for (const criterion of planDoc.criteria) {
    console.log(`- [${criterion.done ? "x" : " "}] ${criterion.text}`);
  }
}

function printPlanSummary(args: string[]): void {
  const planId = requirePlanId(args);
  const planDoc = loadValidatedPlan(planId);
  const json = args.includes("--json");
  const brief = args.includes("--brief");

  if (json) {
    printPlanJson(planDoc);
    return;
  }

  printPlanText(planDoc, brief);
}

function lintPlansCommand(args: string[]): void {
  const planId = args[1];
  const issues = lintPlans(process.cwd(), planId);
  if (issues.length > 0) {
    console.error(formatIssues(issues));
    process.exit(1);
  }

  if (planId) {
    console.log(`✅ ${planId} is valid`);
    return;
  }

  const total = parsePlans().length;
  console.log(`✅ ${total} plan${total === 1 ? "" : "s"} are valid`);
}

export function plan(args: string[]): void {
  const subcommand = args[0];

  if (subcommand === "lint") return lintPlansCommand(args);
  if (subcommand === "show") return printPlanSummary(args);

  console.error("Usage: campsite plan <lint|show> [options]");
  process.exit(1);
}
