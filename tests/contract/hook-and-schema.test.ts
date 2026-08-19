import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  identifyCommitInvocation,
  validateStructure,
} from "../../plugin/hooks/pre-commit-structure.mjs";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("read-only structure hook", () => {
  it("recognizes Unix, Windows, wrapped, and -C commit commands", () => {
    for (const command of [
      "git commit -m \"message\"",
      "git.exe commit --no-verify=false",
      "env git commit -am \"message\"",
      "command git.cmd -C . commit -m \"message\"",
      "git.bat -C . commit -m \"message\"",
    ]) {
      expect(identifyCommitInvocation(command, repositoryRoot).recognized, command).toBe(true);
    }
  });

  it("passes unrelated commands and rejects ambiguous commit syntax", () => {
    expect(identifyCommitInvocation("git status", repositoryRoot).recognized).toBe(false);
    expect(identifyCommitInvocation("echo git commit", repositoryRoot).recognized).toBe(false);
    expect(identifyCommitInvocation("git commit && git commit", repositoryRoot).parseable).toBe(false);
    expect(identifyCommitInvocation("git commit -m \"unterminated", repositoryRoot).parseable).toBe(false);
  });

  it("passes the current Productivity structure without changing it", async () => {
    const before = await fs.stat(path.join(repositoryRoot, "plugin"));
    const result = await validateStructure(repositoryRoot);
    const after = await fs.stat(path.join(repositoryRoot, "plugin"));

    expect(result.ok).toBe(true);
    expect(before.mtimeMs).toBe(after.mtimeMs);
  });

  it("fails closed for an identified but incomplete package", async () => {
    const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "productivity-structure-"));
    try {
      await fs.mkdir(path.join(temporaryRoot, ".agents/plugins"), { recursive: true });
      await fs.mkdir(path.join(temporaryRoot, "plugin"), { recursive: true });
      await fs.writeFile(
        path.join(temporaryRoot, ".agents/plugins/marketplace.json"),
        JSON.stringify({ name: "productivity-plugin", plugins: [] }),
      );
      await fs.writeFile(
        path.join(temporaryRoot, "plugin/plugin.json"),
        JSON.stringify({ name: "productivity", version: "0.1.0" }),
      );

      const result = await validateStructure(temporaryRoot);
      expect(result.ok).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    } finally {
      await fs.rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
