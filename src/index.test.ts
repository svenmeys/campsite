import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { execSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const ENTRYPOINT = join(import.meta.dir, "index.ts");

function createGitRepo(path: string, remote: string): void {
  mkdirSync(path, { recursive: true });
  execSync("git init", { cwd: path, stdio: "ignore" });
  execSync(`git remote add origin ${remote}`, { cwd: path, stdio: "ignore" });
}

function writeConfig(configDir: string, stashRoot: string): void {
  mkdirSync(configDir, { recursive: true });
  writeFileSync(join(configDir, "config.json"), JSON.stringify({ stashRoot }, null, 2));
}

function writePlanningFixture(repo: string, overrides?: { dashboard?: string; plan?: string }): void {
  mkdirSync(join(repo, "plans"), { recursive: true });
  writeFileSync(
    join(repo, "DASHBOARD.md"),
    overrides?.dashboard ?? `---
schema: campsite-dashboard/v1
updated: 2026-03-19
---

# Dashboard

## Now
<!-- campsite:section id=now -->

### Ship This Week
<!-- campsite:section id=now.ship-this-week -->

- [ ] [DB-12] Loosen workspace-owner-only install -- Allow installs by non-owners so other teams can test.
  - plan: [PLAN-3](plans/PLAN-3-non-owner-install.md)
  - ticket: DEMO-123
  - owner: alex

## Done
<!-- campsite:section id=done -->

### Recent
<!-- campsite:section id=done.recent -->

- [x] [DB-8] Ship pricing link
`,
  );
  writeFileSync(
    join(repo, "plans", "PLAN-3-non-owner-install.md"),
    overrides?.plan ?? `---
schema: campsite-plan/v1
id: PLAN-3
title: Non-owner install
status: active
updated: 2026-03-19
ticket: DEMO-123
dashboard:
  - DB-12
---

# PLAN-3: Non-owner install

## Goal

Allow non-owner installs so teams outside the workspace owner can test the app.

## Scope

- Relax install permission gate
- Preserve existing admin checks

## Acceptance Criteria

- [ ] Non-owner install succeeds
- [x] Existing admin checks still pass

## Out of Scope

- Marketplace packaging

## Notes

Check provider install callback assumptions.
`,
  );
}

function runCli(
  cwd: string,
  args: string[],
  paths: { configDir: string; stashRoot: string },
  input?: string,
) {
  return spawnSync(process.execPath, [ENTRYPOINT, ...args], {
    cwd,
    encoding: "utf-8",
    env: {
      ...process.env,
      CAMPSITE_CONFIG_DIR: paths.configDir,
      CAMPSITE_STASH_ROOT: paths.stashRoot,
    },
    input,
  });
}

function expectSuccess(result: ReturnType<typeof runCli>): void {
  expect({
    status: result.status,
    stderr: result.stderr.trim(),
  }).toEqual({ status: 0, stderr: "" });
}

describe("campsite CLI", () => {
  let tempRoot: string;
  let stashRoot: string;
  let configDir: string;

  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), "campsite-cli-test-"));
    stashRoot = join(tempRoot, "stash");
    configDir = join(tempRoot, "config");
    writeConfig(configDir, stashRoot);
  });

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it("shares a stash across clones with the same remote", () => {
    const repoA = join(tempRoot, "workspace", "alpha");
    const repoB = join(tempRoot, "workspace", "beta");
    createGitRepo(repoA, "git@github.com:acme/platform.git");
    createGitRepo(repoB, "https://github.com/acme/platform.git");

    const journal = runCli(repoA, ["journal"], { configDir, stashRoot }, "# Session A");
    expectSuccess(journal);

    const status = runCli(repoB, ["status", "--json"], { configDir, stashRoot });
    expectSuccess(status);

    const payload = JSON.parse(status.stdout);
    expect(payload.stashDir).toBe(join(stashRoot, "github-com-acme-platform"));
    expect(payload.journals.total).toBe(1);
    expect(payload.exists).toBe(true);
  });

  it("returns agent-friendly JSON for context and status", () => {
    const repo = join(tempRoot, "workspace", "app");
    createGitRepo(repo, "git@github.com:acme/app.git");

    expectSuccess(runCli(repo, ["context", "Need tests next"], { configDir, stashRoot }));
    expectSuccess(runCli(repo, ["sq", "Refactor auth flow"], { configDir, stashRoot }));
    expectSuccess(runCli(repo, ["journal"], { configDir, stashRoot }, "# Session Journal"));

    const context = runCli(repo, ["context", "--json"], { configDir, stashRoot });
    const status = runCli(repo, ["status", "--json"], { configDir, stashRoot });

    expectSuccess(context);
    expectSuccess(status);

    const ctxPayload = JSON.parse(context.stdout);
    expect(ctxPayload).toMatchObject({
      repo: "app",
      exists: true,
    });
    expect(ctxPayload.content).toContain("type: log");
    expect(ctxPayload.content).toContain("Need tests next");
    expect(JSON.parse(status.stdout)).toMatchObject({
      repo: "app",
      exists: true,
      journals: { total: 1, today: 1 },
      workingContext: { total: 1 },
      sideQuests: { open: 1 },
    });
  });

  it("shows compact help without compacting journals", () => {
    const repo = join(tempRoot, "workspace", "compact-help");
    createGitRepo(repo, "git@github.com:acme/compact-help.git");
    const journalDir = join(stashRoot, "github-com-acme-compact-help", "journal");
    mkdirSync(journalDir, { recursive: true });
    writeFileSync(join(journalDir, "2026-03-19-S1.md"), "---\ntitle: Empty\n---\n");

    const result = runCli(repo, ["compact", "--help"], { configDir, stashRoot });

    expectSuccess(result);
    expect(result.stdout).toContain("Usage: campsite compact");
    expect(result.stdout).not.toContain("deleted");
    expect(readFileSync(join(journalDir, "2026-03-19-S1.md"), "utf-8")).toContain("title: Empty");
  });

  it("does not create a side quest when listing side quests", () => {
    const repo = join(tempRoot, "workspace", "sq-list");
    createGitRepo(repo, "git@github.com:acme/sq-list.git");

    const result = runCli(repo, ["sq", "list"], { configDir, stashRoot });
    const status = runCli(repo, ["status", "--json"], { configDir, stashRoot });

    expectSuccess(result);
    expect(result.stdout).toContain("No side quests.");
    expectSuccess(status);
    expect(JSON.parse(status.stdout)).toMatchObject({
      sideQuests: { open: 0 },
    });
  });

  it("files a side quest from a linked worktree under the main checkout", () => {
    const repo = join(tempRoot, "workspace", "wt-main");
    createGitRepo(repo, "git@github.com:acme/wt-main.git");
    execSync("git commit --allow-empty -m init", { cwd: repo, stdio: "ignore" });
    const worktree = join(tempRoot, "workspace", "throwaway-worktree-name");
    execSync(`git worktree add -b side "${worktree}"`, { cwd: repo, stdio: "ignore" });

    const result = runCli(worktree, ["sq", "note from a worktree"], { configDir, stashRoot });
    expectSuccess(result);

    // With an origin, the stash id is already remote-derived, so only repoName moves
    // here: the old code stamped the disposable worktree directory name.
    expect(
      readFileSync(join(stashRoot, "github-com-acme-wt-main", ".repo.json"), "utf-8"),
    ).toContain('"repoName": "wt-main"');
    expect(
      readFileSync(join(stashRoot, "github-com-acme-wt-main", "backlog.md"), "utf-8"),
    ).toContain("note from a worktree");
  });

  it("keeps one stash for a worktree of a repo with no remote", () => {
    // The case where resolution actually splits: with no origin, getRepoId falls back
    // to the repo name, so the old code gave every worktree its own stash directory.
    const repo = join(tempRoot, "workspace", "no-remote-main");
    mkdirSync(repo, { recursive: true });
    execSync("git init", { cwd: repo, stdio: "ignore" });
    execSync('git -c user.name=t -c user.email=t@t commit --allow-empty -m init', {
      cwd: repo,
      stdio: "ignore",
    });
    const worktree = join(tempRoot, "workspace", "no-remote-throwaway");
    execSync(`git worktree add -b side "${worktree}"`, { cwd: repo, stdio: "ignore" });

    const result = runCli(worktree, ["sq", "note without a remote"], { configDir, stashRoot });
    expectSuccess(result);

    expect(
      readFileSync(join(stashRoot, "no-remote-main", "backlog.md"), "utf-8"),
    ).toContain("note without a remote");
    expect(existsSync(join(stashRoot, "no-remote-throwaway"))).toBe(false);
  });

  it("initializes a stash using the configured root", () => {
    const repo = join(tempRoot, "workspace", "docs");
    createGitRepo(repo, "git@github.com:acme/docs.git");

    const result = runCli(repo, ["init"], { configDir, stashRoot });
    expectSuccess(result);

    expect(result.stdout).toContain('Stash ready for "docs"');
    expect(readFileSync(join(stashRoot, "github-com-acme-docs", ".repo.json"), "utf-8")).toContain(
      '"repoName": "docs"',
    );
  });

  it("lints and shows dashboard and plan markdown", () => {
    const repo = join(tempRoot, "workspace", "planner");
    createGitRepo(repo, "git@github.com:acme/planner.git");
    writePlanningFixture(repo);

    const dashboardLint = runCli(repo, ["dashboard", "lint"], { configDir, stashRoot });
    const dashboardShow = runCli(
      repo,
      ["dashboard", "show", "--section", "now.ship-this-week", "--brief"],
      { configDir, stashRoot },
    );
    const dashboardItem = runCli(repo, ["dashboard", "item", "DB-12", "--json"], { configDir, stashRoot });
    const planLint = runCli(repo, ["plan", "lint"], { configDir, stashRoot });
    const planShow = runCli(repo, ["plan", "show", "PLAN-3", "--brief"], { configDir, stashRoot });

    expectSuccess(dashboardLint);
    expectSuccess(dashboardShow);
    expectSuccess(dashboardItem);
    expectSuccess(planLint);
    expectSuccess(planShow);

    expect(dashboardShow.stdout).toContain("Ship This Week (now.ship-this-week)");
    expect(dashboardShow.stdout).toContain("[DB-12] Loosen workspace-owner-only install");
    expect(JSON.parse(dashboardItem.stdout)).toMatchObject({
      id: "DB-12",
      planId: "PLAN-3",
      section: { id: "now.ship-this-week" },
      title: "Loosen workspace-owner-only install",
    });
    expect(planShow.stdout).toContain("PLAN-3: Non-owner install");
    expect(planShow.stdout).toContain("Acceptance Criteria: 1/2");
  });

  it("fails dashboard lint when a linked plan file is missing", () => {
    const repo = join(tempRoot, "workspace", "broken-planner");
    createGitRepo(repo, "git@github.com:acme/broken-planner.git");
    writePlanningFixture(repo, {
      dashboard: `---
schema: campsite-dashboard/v1
updated: 2026-03-19
---

# Dashboard

## Now
<!-- campsite:section id=now -->

- [ ] [DB-99] Missing linked plan
  - plan: [PLAN-9](plans/PLAN-9-missing.md)
`,
    });

    const result = runCli(repo, ["dashboard", "lint"], { configDir, stashRoot });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Linked plan file does not exist");
  });
});
