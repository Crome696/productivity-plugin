import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

interface CommunicationScenario {
  name: string;
  mode: "create" | "rewrite";
  conversation_language: string;
  artifact_type: string;
  audience: "technical" | "business" | "mixed";
  tone: string;
  status: "ready" | "needs_clarification" | "blocked";
  title: string | null;
  body: string | null;
  missing_information: string[];
  open_questions: string[];
  preserve: string[];
}

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function read(relativePath: string): Promise<string> {
  return fs.readFile(path.join(repositoryRoot, relativePath), "utf8");
}

function assertArtifactInvariants(scenario: CommunicationScenario): void {
  expect(scenario.conversation_language.length).toBeGreaterThanOrEqual(2);
  expect(scenario.artifact_type.length).toBeGreaterThan(0);
  if (scenario.status === "ready") {
    expect(scenario.title?.length).toBeGreaterThan(0);
    expect(scenario.body?.length).toBeGreaterThan(0);
    expect(scenario.missing_information).toHaveLength(0);
    expect(scenario.open_questions).toHaveLength(0);
    for (const identifier of scenario.preserve) {
      expect(scenario.body).toContain(identifier);
    }
  } else {
    expect(scenario.title).toBeNull();
    expect(scenario.body).toBeNull();
  }
}

describe("adaptive communication workflow scenarios", () => {
  it("covers create, rewrite, all audience profiles, clarification, and blocked results", async () => {
    const scenarios = JSON.parse(await read("tests/fixtures/communication-scenarios.json")) as CommunicationScenario[];

    expect(scenarios.map((scenario) => scenario.mode)).toEqual(expect.arrayContaining(["create", "rewrite"]));
    expect(scenarios.map((scenario) => scenario.audience)).toEqual(expect.arrayContaining(["technical", "business", "mixed"]));
    expect(scenarios.map((scenario) => scenario.status)).toEqual(expect.arrayContaining(["ready", "needs_clarification", "blocked"]));
    expect(scenarios.some((scenario) => scenario.conversation_language !== "en-US")).toBe(true);
    expect(scenarios.some((scenario) => scenario.tone === "outcome-oriented")).toBe(true);
    expect(scenarios.some((scenario) => scenario.open_questions.length > 0)).toBe(true);
    expect(scenarios.some((scenario) => scenario.missing_information.length > 0)).toBe(true);

    for (const scenario of scenarios) {
      assertArtifactInvariants(scenario);
    }
  });

  it("keeps ownership thin and documents the English artifact boundary", async () => {
    const command = await read("plugin/commands/communicate.md");
    const agent = await read("plugin/agents/communication-agent.md");
    const skill = await read("plugin/skills/adapt-communication/SKILL.md");
    const rule = await read("plugin/rules/communication-policy.mdc");

    expect(command).toContain("communication-agent");
    expect(command).toContain("thin entry point");
    expect(agent).toContain("communication-policy");
    expect(agent).toContain("adapt-communication");
    expect(agent).toContain("CommunicationArtifact");
    expect(skill).toContain("create");
    expect(skill).toContain("rewrite");
    expect(skill).toContain("technical");
    expect(skill).toContain("business");
    expect(skill).toContain("mixed");
    expect(skill).toContain("English");
    expect(skill).toMatch(/Do\s+not add commitments/);
    expect(rule).toContain("Do not invent facts");
    expect(rule).toContain("artifact_language");
    expect(rule).toContain("Do not save, send, publish");
  });
});
