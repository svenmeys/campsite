#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const pkgPath = join(import.meta.dir, "..", "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
const [major, minor, patch] = pkg.version.split(".").map(Number);

const bumps: Record<string, string> = {
  patch: `${major}.${minor}.${patch + 1}`,
  minor: `${major}.${minor + 1}.0`,
  major: `${major + 1}.0.0`,
};

const arg = process.argv[2];

// If passed directly: bun run scripts/release.ts patch
if (arg && bumps[arg]) {
  await release(bumps[arg]);
} else {
  console.log(`\n📦 ${pkg.name}@${pkg.version}\n`);
  console.log(`  1) patch → ${bumps.patch}`);
  console.log(`  2) minor → ${bumps.minor}`);
  console.log(`  3) major → ${bumps.major}\n`);

  process.stdout.write("Bump [1]: ");
  let choice = "";
  for await (const line of console) {
    choice = line.trim();
    break;
  }

  const map: Record<string, string> = { "": "patch", "1": "patch", "2": "minor", "3": "major" };
  const selected = map[choice];
  if (!selected) {
    console.error("Invalid choice");
    process.exit(1);
  }
  const version = bumps[selected];
  if (!version) {
    console.error("Invalid bump type");
    process.exit(1);
  }
  await release(version);
}

async function release(version: string): Promise<void> {
  pkg.version = version;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`\n🔖 ${pkg.name}@${version}`);

  const publish = Bun.spawn(["npm", "publish"], {
    cwd: join(import.meta.dir, ".."),
    stdio: ["inherit", "inherit", "inherit"],
  });
  const code = await publish.exited;
  if (code !== 0) {
    console.error(`\nPublish failed (exit ${code}). Version bumped in package.json — retry with: npm publish`);
    process.exit(code);
  }
  console.log(`\n✅ Published ${pkg.name}@${version}`);
}
