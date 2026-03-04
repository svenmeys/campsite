import { describe, it, expect } from "bun:test";
import { flagValue } from "./args.ts";

describe("flagValue", () => {
  it("returns value after flag", () => {
    expect(flagValue(["--type", "quest"], "--type")).toBe("quest");
  });

  it("returns undefined when flag missing", () => {
    expect(flagValue(["--type", "quest"], "--title")).toBeUndefined();
  });

  it("returns undefined when flag is last arg", () => {
    expect(flagValue(["--type"], "--type")).toBeUndefined();
  });

  it("returns first match when flag appears multiple times", () => {
    expect(flagValue(["--type", "a", "--type", "b"], "--type")).toBe("a");
  });

  it("returns undefined for empty args", () => {
    expect(flagValue([], "--type")).toBeUndefined();
  });
});
