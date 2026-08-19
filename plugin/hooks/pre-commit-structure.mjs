import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT_MARKETPLACES = [
  ".agents/plugins/marketplace.json",
  ".cursor-plugin/marketplace.json",
  ".claude-plugin/marketplace.json",
];

const PLUGIN_MANIFESTS = [
  "plugin/plugin.json",
  "plugin/.claude-plugin/plugin.json",
  "plugin/.codex-plugin/plugin.json",
  "plugin/.cursor-plugin/plugin.json",
];

const REQUIRED_PLUGIN_FILES = [
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

const DEV_ONLY_PLUGIN_PATTERNS = [
  /^(?:package(?:-lock)?\.json)$/i,
  /^tsconfig(?:\..*)?\.json$/i,
  /^vitest\.config\./i,
  /^(?:tests|node_modules|coverage)(?:[\\/]|$)/i,
];

const WRAPPERS = new Set([
  "sudo",
  "env",
  "command",
  "exec",
  "nohup",
  "nice",
  "setsid",
]);

function executableName(value) {
  return value.split(/[\\/]/).pop()?.toLowerCase() ?? "";
}

function pushToken(segment, token) {
  if (token.length > 0) {
    segment.push(token);
  }
}

/**
 * Tokenize enough shell syntax to identify a single git commit invocation.
 * Unsupported shell syntax is treated as unparseable instead of guessed.
 */
export function tokenizeShell(command) {
  const segments = [[]];
  let token = "";
  let quote = null;
  let escaped = false;

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];

    if (escaped) {
      token += character;
      escaped = false;
      continue;
    }

    if (character === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }

    if (quote !== null) {
      if (character === quote) {
        quote = null;
      } else {
        token += character;
      }
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }

    if (/\s/.test(character)) {
      pushToken(segments.at(-1), token);
      token = "";
      continue;
    }

    if (character === ";" || character === "|" || character === "&") {
      pushToken(segments.at(-1), token);
      token = "";
      if (character === "&" && command[index + 1] === "&") {
        index += 1;
      } else if (character === "|" && command[index + 1] === "|") {
        index += 1;
      }
      segments.push([]);
      continue;
    }

    token += character;
  }

  if (escaped || quote !== null) {
    return { segments: null, error: "unterminated shell escape or quote" };
  }

  pushToken(segments.at(-1), token);
  return { segments: segments.filter((segment) => segment.length > 0), error: null };
}

function looksLikeCommitCommand(command) {
  return /(?:^|[;&|]\s*)(?:(?:sudo|env|command|exec|nohup)\s+)*[^\s;&|]+git(?:\.exe|\.cmd|\.bat)?\b[\s\S]*\bcommit\b/i.test(
    command,
  ) || /(?:^|[;&|]\s*)(?:(?:sudo|env|command|exec|nohup)\s+)*git(?:\.exe|\.cmd|\.bat)?\b[\s\S]*\bcommit\b/i.test(
    command,
  );
}

function readOptionValue(tokens, index) {
  const value = tokens[index + 1];
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Identify a commit command without treating a branch name, filename, or
 * arbitrary text as proof of a commit operation.
 */
export function identifyCommitInvocation(command, initialDirectory = process.cwd()) {
  if (typeof command !== "string" || command.trim().length === 0) {
    return { recognized: false, parseable: true, directory: initialDirectory, reason: null };
  }

  const tokenized = tokenizeShell(command);
  if (tokenized.segments === null) {
    return {
      recognized: false,
      parseable: false,
      likelyCommit: looksLikeCommitCommand(command),
      directory: initialDirectory,
      reason: tokenized.error,
    };
  }

  const matches = [];
  for (const segment of tokenized.segments) {
    let index = 0;
    while (WRAPPERS.has(segment[index]?.toLowerCase())) {
      index += 1;
    }

    const commandName = executableName(segment[index] ?? "");
    if (!/^git(?:\.exe|\.cmd|\.bat)?$/.test(commandName)) {
      continue;
    }

    let directory = initialDirectory;
    let subcommand = null;
    for (index += 1; index < segment.length; index += 1) {
      const option = segment[index];
      if (option === "-C") {
        const value = readOptionValue(segment, index);
        if (value === null) {
          return {
            recognized: false,
            parseable: false,
            likelyCommit: true,
            directory: initialDirectory,
            reason: "git -C is missing its directory",
          };
        }
        directory = path.resolve(initialDirectory, value);
        index += 1;
        continue;
      }
      if (option.startsWith("-C") && option.length > 2) {
        directory = path.resolve(initialDirectory, option.slice(2));
        continue;
      }
      if (option === "-c" || option === "--config-env") {
        if (readOptionValue(segment, index) === null) {
          return {
            recognized: false,
            parseable: false,
            likelyCommit: true,
            directory: initialDirectory,
            reason: `${option} is missing its value`,
          };
        }
        index += 1;
        continue;
      }
      if (option.startsWith("-")) {
        continue;
      }
      subcommand = option.toLowerCase();
      break;
    }

    if (subcommand === "commit") {
      matches.push({ directory });
    }
  }

  if (matches.length === 0) {
    return { recognized: false, parseable: true, directory: initialDirectory, reason: null };
  }
  if (matches.length > 1) {
    return {
      recognized: false,
      parseable: false,
      likelyCommit: true,
      directory: matches[0].directory,
      reason: "more than one git commit invocation was supplied",
    };
  }
  return {
    recognized: true,
    parseable: true,
    directory: matches[0].directory,
    reason: null,
  };
}

async function pathExists(candidate) {
  try {
    await fs.access(candidate);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(candidate) {
  try {
    return (await fs.stat(candidate)).isDirectory();
  } catch {
    return false;
  }
}

async function readText(candidate) {
  return fs.readFile(candidate, "utf8");
}

async function readJson(candidate) {
  return JSON.parse(await readText(candidate));
}

export async function findRepositoryRoot(startDirectory = process.cwd()) {
  let current = path.resolve(startDirectory);
  while (true) {
    if (
      await pathExists(path.join(current, ".git")) &&
      await pathExists(path.join(current, "plugin"))
    ) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

async function parseContractYaml(candidate) {
  const source = await readText(candidate);
  if (/\t/.test(source)) {
    throw new Error("YAML contract contains tabs");
  }

  try {
    const yaml = await import("js-yaml");
    return yaml.load(source);
  } catch (error) {
    if (error?.name !== "ERR_MODULE_NOT_FOUND" && !String(error?.message).includes("Cannot find package")) {
      throw error;
    }
    const requiredMarkers = [
      "schema: CommunicationArtifact",
      "version: 1",
      "type: object",
      "properties:",
      "status:",
      "mode:",
      "artifact_language:",
      "failure:",
    ];
    if (!requiredMarkers.every((marker) => source.includes(marker))) {
      throw new Error("YAML contract is missing required markers");
    }
    return { schema: "CommunicationArtifact", version: 1, type: "object" };
  }
}

function addError(errors, message) {
  errors.push(message);
}

function resolvePluginPath(root, declaredPath) {
  if (typeof declaredPath !== "string" || declaredPath.trim().length === 0) {
    return null;
  }
  const normalized = declaredPath.replaceAll("\\", "/").replace(/^\.\//, "");
  if (path.posix.isAbsolute(normalized) || normalized.split("/").includes("..")) {
    return null;
  }
  const pluginRoot = path.resolve(root, "plugin");
  const resolved = path.resolve(pluginRoot, normalized);
  if (resolved !== pluginRoot && !resolved.startsWith(`${pluginRoot}${path.sep}`)) {
    return null;
  }
  return resolved;
}

async function validateManifestDeclaredPaths(root, manifestPath, manifest, errors) {
  for (const field of ["logo", "skills", "agents", "commands", "rules", "hooks"]) {
    if (!(field in manifest)) {
      continue;
    }
    const resolved = resolvePluginPath(root, manifest[field]);
    if (resolved === null || !(await pathExists(resolved))) {
      addError(errors, `${manifestPath} declares an invalid or missing ${field} path`);
    }
  }
}

async function walkFiles(directory, relative = "") {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryRelative = relative ? path.join(relative, entry.name) : entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(absolute, entryRelative)));
    } else if (entry.isFile()) {
      files.push(entryRelative);
    }
  }
  return files;
}

async function hasProductivityIdentity(root) {
  return (
    (await pathExists(path.join(root, ".agents/plugins/marketplace.json"))) &&
    (await pathExists(path.join(root, "plugin/plugin.json")))
  );
}

export async function validateStructure(root) {
  const errors = [];
  const jsonDocuments = new Map();

  for (const relativePath of [...ROOT_MARKETPLACES, ...PLUGIN_MANIFESTS, "plugin/hooks/codex-hooks.json", "plugin/hooks/cursor-hooks.json"]) {
    const absolute = path.join(root, relativePath);
    if (!(await pathExists(absolute))) {
      addError(errors, `missing JSON file: ${relativePath}`);
      continue;
    }
    try {
      const document = await readJson(absolute);
      jsonDocuments.set(relativePath, document);
    } catch (error) {
      addError(errors, `invalid JSON in ${relativePath}: ${error.message}`);
    }
  }

  for (const relativePath of REQUIRED_PLUGIN_FILES) {
    if (!(await pathExists(path.join(root, relativePath)))) {
      addError(errors, `missing required package path: ${relativePath}`);
    }
  }

  for (const relativePath of ROOT_MARKETPLACES) {
    const document = jsonDocuments.get(relativePath);
    if (!document) continue;
    if (document.name !== "productivity-plugin") {
      addError(errors, `${relativePath} must identify productivity-plugin`);
    }
    if (!Array.isArray(document.plugins) || document.plugins.length !== 1) {
      addError(errors, `${relativePath} must contain exactly one plugin entry`);
      continue;
    }
    const entry = document.plugins[0];
    const source = typeof entry.source === "string" ? entry.source : entry.source?.path;
    if (entry.name !== "productivity" || source !== "./plugin" || entry.version !== "0.1.0") {
      addError(errors, `${relativePath} has an unsynchronized Productivity entry`);
    }
  }

  const core = {
    name: "productivity",
    version: "0.1.0",
    author: "CromeSDK",
    license: "MIT",
    repository: "https://github.com/Crome696/productivity-plugin",
  };
  for (const relativePath of PLUGIN_MANIFESTS) {
    const manifest = jsonDocuments.get(relativePath);
    if (!manifest) continue;
    if (manifest.name !== core.name || manifest.version !== core.version) {
      addError(errors, `${relativePath} has an invalid name or version`);
    }
    if (manifest.author?.name !== core.author || manifest.license !== core.license || manifest.repository !== core.repository) {
      addError(errors, `${relativePath} has unsynchronized author, license, or repository metadata`);
    }
    if (manifest.category !== "productivity") {
      addError(errors, `${relativePath} must use the productivity category`);
    }
    await validateManifestDeclaredPaths(root, relativePath, manifest, errors);
  }

  try {
    const schema = await parseContractYaml(path.join(root, "plugin/shared/schemas/CommunicationArtifact.yaml"));
    if (schema?.schema !== "CommunicationArtifact" || schema?.version !== 1 || schema?.type !== "object") {
      addError(errors, "CommunicationArtifact.yaml has an invalid contract identity");
    }
  } catch (error) {
    addError(errors, `invalid YAML in CommunicationArtifact.yaml: ${error.message}`);
  }

  if (await isDirectory(path.join(root, "plugin"))) {
    for (const relativePath of await walkFiles(path.join(root, "plugin"))) {
      if (DEV_ONLY_PLUGIN_PATTERNS.some((pattern) => pattern.test(relativePath.replaceAll("\\", "/")))) {
        addError(errors, `development-only path is inside the installable package: plugin/${relativePath}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

function extractCommand(input) {
  if (!input || typeof input !== "object") return null;
  if (typeof input.command === "string") return input.command;
  if (input.tool_input && typeof input.tool_input.command === "string") return input.tool_input.command;
  if (input.toolInput && typeof input.toolInput.command === "string") return input.toolInput.command;
  return null;
}

async function readHookInput() {
  if (process.stdin.isTTY) return null;
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const source = Buffer.concat(chunks).toString("utf8").trim();
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch {
    return null;
  }
}

export async function main(argv = process.argv.slice(2), input = undefined) {
  const checkOnly = argv.includes("--check");
  const hookInput = input === undefined ? await readHookInput() : input;
  const initialDirectory = hookInput?.cwd ?? hookInput?.working_directory ?? process.cwd();

  if (!checkOnly) {
    const command = extractCommand(hookInput);
    const invocation = identifyCommitInvocation(command, initialDirectory);
    if (!invocation.parseable) {
      if (!invocation.likelyCommit) return 0;
      console.error(`Productivity structure check blocked: ${invocation.reason}`);
      return 1;
    }
    if (!invocation.recognized) return 0;
  }

  const root = await findRepositoryRoot(checkOnly ? process.cwd() : initialDirectory);
  if (!root) return checkOnly ? 1 : 0;
  if (!checkOnly && !(await hasProductivityIdentity(root))) return 0;

  const result = await validateStructure(root);
  if (!result.ok) {
    console.error("Productivity structure validation failed:");
    for (const error of result.errors) console.error(`- ${error}`);
    return 1;
  }
  if (checkOnly) console.log("Productivity structure validation passed.");
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exitCode = await main();
}
