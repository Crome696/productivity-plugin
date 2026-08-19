import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load as parseYaml } from "js-yaml";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const rootMarketplacePaths = [
  ".agents/plugins/marketplace.json",
  ".cursor-plugin/marketplace.json",
  ".claude-plugin/marketplace.json",
];

const pluginManifestPaths = [
  "plugin/plugin.json",
  "plugin/.claude-plugin/plugin.json",
  "plugin/.codex-plugin/plugin.json",
  "plugin/.cursor-plugin/plugin.json",
];

const requiredPluginPaths = [
  "plugin/AGENTS.md",
  "plugin/README.md",
  "plugin/plugin.json",
  "plugin/.claude-plugin/plugin.json",
  "plugin/.codex-plugin/plugin.json",
  "plugin/.cursor-plugin/plugin.json",
  "plugin/agents/communication-agent.md",
  "plugin/assets/logo.png",
  "plugin/commands/communicate.md",
  "plugin/docs/README.md",
  "plugin/hooks/codex-hooks.json",
  "plugin/hooks/cursor-hooks.json",
  "plugin/hooks/pre-commit-structure.mjs",
  "plugin/rules/communication-policy.mdc",
  "plugin/shared/schemas/CommunicationArtifact.yaml",
  "plugin/skills/adapt-communication/SKILL.md",
];

type JsonObject = Record<string, unknown>;

async function readJson(relativePath: string): Promise<JsonObject> {
  return JSON.parse(await fs.readFile(path.join(repositoryRoot, relativePath), "utf8")) as JsonObject;
}

function objectValue(value: unknown): JsonObject {
  return typeof value === "object" && value !== null ? value as JsonObject : {};
}

function pluginEntry(document: JsonObject): JsonObject {
  const plugins = Array.isArray(document.plugins) ? document.plugins : [];
  return objectValue(plugins[0]);
}

describe("Marketplace and plugin manifests", () => {
  it("parses all root descriptors and resolves the installable source", async () => {
    for (const relativePath of rootMarketplacePaths) {
      const document = await readJson(relativePath);
      const entry = pluginEntry(document);
      const source = typeof entry.source === "string" ? entry.source : objectValue(entry.source).path;

      expect(document.name, relativePath).toBe("productivity-plugin");
      expect(document.plugins, relativePath).toHaveLength(1);
      expect(entry.name, relativePath).toBe("productivity");
      expect(entry.version, relativePath).toBe("0.1.0");
      expect(source, relativePath).toBe("./plugin");
      await expect(fs.stat(path.join(repositoryRoot, "plugin"))).resolves.toBeTruthy();
    }
  });

  it("keeps the four plugin manifests synchronized on core identity", async () => {
    const manifests = await Promise.all(pluginManifestPaths.map(readJson));
    const core = manifests.map((manifest) => ({
      name: manifest.name,
      version: manifest.version,
      author: objectValue(manifest.author).name,
      license: manifest.license,
      homepage: manifest.homepage,
      repository: manifest.repository,
      category: manifest.category,
    }));

    for (const identity of core) {
      expect(identity).toMatchObject({
        name: "productivity",
        version: "0.1.0",
        author: "CromeSDK",
        license: "MIT",
        homepage: "https://github.com/Crome696/productivity-plugin",
        repository: "https://github.com/Crome696/productivity-plugin",
        category: "productivity",
      });
    }
    expect(new Set(manifests.map((manifest) => JSON.stringify(manifest.keywords)))).toHaveLength(1);
    expect(new Set(manifests.map((manifest) => JSON.stringify(manifest.tags)))).toHaveLength(1);
  });

  it("resolves every required package path and keeps development tooling outside plugin", async () => {
    for (const relativePath of requiredPluginPaths) {
      await expect(fs.stat(path.join(repositoryRoot, relativePath))).resolves.toBeTruthy();
    }

    const pluginFiles = await listFiles(path.join(repositoryRoot, "plugin"));
    for (const relativePath of pluginFiles) {
      expect(relativePath).not.toMatch(/(^|[\\/])(?:package(?:-lock)?\.json|tsconfig(?:\..*)?\.json|vitest\.config\.)/i);
      expect(relativePath).not.toMatch(/^(?:tests|node_modules|coverage)(?:[\\/]|$)/i);
    }
  });

  it("parses the contract YAML and verifies the PNG asset", async () => {
    const contract = objectValue(parseYaml(await fs.readFile(
      path.join(repositoryRoot, "plugin/shared/schemas/CommunicationArtifact.yaml"),
      "utf8",
    )));
    const required = Array.isArray(contract.required) ? contract.required : [];
    const properties = objectValue(contract.properties);

    expect(contract.schema).toBe("CommunicationArtifact");
    expect(contract.version).toBe(1);
    expect(contract.type).toBe("object");
    expect(required).toEqual(expect.arrayContaining([
      "status",
      "mode",
      "conversation_language",
      "artifact_type",
      "audience",
      "tone",
      "artifact_language",
      "title",
      "body",
      "missing_information",
      "open_questions",
      "failure",
    ]));
    expect(objectValue(properties.artifact_language).const).toBe("en");
    expect(objectValue(properties.status).enum).toEqual(["ready", "needs_clarification", "blocked"]);
    expect(objectValue(properties.mode).enum).toEqual(["create", "rewrite"]);
    expect(objectValue(properties.audience).enum).toEqual(["technical", "business", "mixed"]);

    const png = await fs.readFile(path.join(repositoryRoot, "plugin/assets/logo.png"));
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  it("keeps host hook projections limited to their declared validators", async () => {
    const cursor = await readJson("plugin/hooks/cursor-hooks.json");
    const codex = await readJson("plugin/hooks/codex-hooks.json");
    const cursorText = JSON.stringify(cursor);
    const codexText = JSON.stringify(codex);

    expect(cursorText).toContain("pre-commit-structure.mjs");
    expect(cursorText).toContain("git");
    expect(cursorText).toContain(".exe");
    expect(codexText).toContain("PreToolUse");
    expect(codexText).toContain("commandWindows");
    expect(codexText).toContain("pre-commit-structure.mjs");
  });
});

async function listFiles(directory: string, relative = ""): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const childRelative = relative ? path.join(relative, entry.name) : entry.name;
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(child, childRelative));
    } else if (entry.isFile()) {
      files.push(childRelative);
    }
  }
  return files;
}
