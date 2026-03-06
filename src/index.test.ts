import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { execSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

    expect(JSON.parse(context.stdout)).toMatchObject({
      repo: "app",
      exists: true,
      content: "Need tests next",
    });
    expect(JSON.parse(status.stdout)).toMatchObject({
      repo: "app",
      exists: true,
      journals: { total: 1, today: 1 },
      workingContext: { total: 1 },
      sideQuests: { open: 1 },
    });
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
});
