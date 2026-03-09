#!/usr/bin/env node

import { createInterface } from "node:readline/promises";
import { stdin, stdout, platform, argv, exit } from "node:process";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { execSync } from "node:child_process";

const BASE_URL = process.env.BRAIN_SERVER_URL || "https://dash.brain-ai.dev";
const MCP_URL = `${BASE_URL}/mcp`;
const DASHBOARD_URL = `${BASE_URL}/settings`;

const BANNER = `
  ____            _        ____ _                 _
 | __ ) _ __ __ _(_)_ __  / ___| | ___  _   _  __| |
 |  _ \\| '__/ _\` | | '_ \\| |   | |/ _ \\| | | |/ _\` |
 | |_) | | | (_| | | | | | |___| | (_) | |_| | (_| |
 |____/|_|  \\__,_|_|_| |_|\\____|_|\\___/ \\__,_|\\__,_|

  MCP Server Installer
`;

interface ConfigTarget {
  name: string;
  path: string;
  exists: boolean;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function openUrl(url: string): void {
  try {
    if (platform === "darwin") {
      execSync(`open ${url}`);
    } else if (platform === "linux") {
      execSync(`xdg-open ${url} 2>/dev/null || true`);
    } else if (platform === "win32") {
      execSync(`start ${url}`);
    }
  } catch {
    // Silently fail — user can open manually
  }
}

async function getConfigTargets(): Promise<ConfigTarget[]> {
  const home = homedir();
  const targets: ConfigTarget[] = [];

  // Claude Code
  const claudeCodePath = join(home, ".claude", "settings.json");
  targets.push({
    name: "Claude Code",
    path: claudeCodePath,
    exists: await fileExists(claudeCodePath),
  });

  // Claude Desktop
  let desktopPath: string;
  if (platform === "darwin") {
    desktopPath = join(
      home,
      "Library",
      "Application Support",
      "Claude",
      "claude_desktop_config.json"
    );
  } else {
    desktopPath = join(home, ".config", "Claude", "claude_desktop_config.json");
  }
  targets.push({
    name: "Claude Desktop",
    path: desktopPath,
    exists: await fileExists(desktopPath),
  });

  return targets;
}

async function readJsonFile(path: string): Promise<Record<string, unknown>> {
  try {
    const content = await readFile(path, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function writeConfig(
  target: ConfigTarget,
  apiKey: string
): Promise<void> {
  const config = await readJsonFile(target.path);

  const mcpServers =
    (config.mcpServers as Record<string, unknown> | undefined) ?? {};
  mcpServers["brain-cloud"] = {
    type: "url",
    url: MCP_URL,
    headers: {
      "X-API-Key": apiKey,
    },
  };
  config.mcpServers = mcpServers;

  const dir = join(target.path, "..");
  await mkdir(dir, { recursive: true });
  await writeFile(target.path, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

async function testConnection(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const command = argv[2];

  if (command !== "init") {
    console.log(BANNER);
    console.log("Usage: brain-cloud init");
    console.log(
      "\nSets up Brain Cloud as an MCP server for Claude Code or Claude Desktop."
    );
    exit(command === undefined ? 0 : 1);
  }

  console.log(BANNER);

  const rl = createInterface({ input: stdin, output: stdout });

  try {
    // Step 1: Get API key
    const hasKey = await rl.question("Do you have an API key? (y/n): ");

    let apiKey: string;

    if (hasKey.toLowerCase().startsWith("y")) {
      apiKey = (await rl.question("Paste your API key: ")).trim();
    } else {
      console.log(`\nVisit ${DASHBOARD_URL} to create an API key.`);
      openUrl(DASHBOARD_URL);
      apiKey = (
        await rl.question("\nPaste your API key when ready: ")
      ).trim();
    }

    if (!apiKey) {
      console.error("Error: No API key provided.");
      exit(1);
    }

    // Step 2: Test connection
    console.log("\nVerifying connection...");
    const connected = await testConnection(apiKey);

    if (!connected) {
      console.error(
        "Error: Could not connect to Brain Cloud. Check your API key and try again."
      );
      exit(1);
    }

    console.log("Connection verified!\n");

    // Step 3: Choose config target
    const targets = await getConfigTargets();
    const existing = targets.filter((t) => t.exists);

    let target: ConfigTarget;

    if (existing.length === 1) {
      target = existing[0];
      console.log(`Detected ${target.name} config at ${target.path}`);
    } else if (existing.length > 1) {
      console.log("Multiple Claude configs detected:\n");
      existing.forEach((t, i) => console.log(`  ${i + 1}. ${t.name}`));
      const choice = await rl.question("\nWhich one? (number): ");
      const idx = parseInt(choice, 10) - 1;
      if (idx < 0 || idx >= existing.length) {
        console.error("Invalid choice.");
        exit(1);
      }
      target = existing[idx];
    } else {
      console.log("No existing Claude config found. Choose where to set up:\n");
      targets.forEach((t, i) => console.log(`  ${i + 1}. ${t.name}`));
      const choice = await rl.question("\nWhich one? (number): ");
      const idx = parseInt(choice, 10) - 1;
      if (idx < 0 || idx >= targets.length) {
        console.error("Invalid choice.");
        exit(1);
      }
      target = targets[idx];
    }

    // Step 4: Write config
    await writeConfig(target, apiKey);
    console.log(`\nConfig written to ${target.path}`);

    // Step 5: Done
    console.log(`
You're all set!

Brain Cloud MCP server is now configured for ${target.name}.

Next steps:
  1. Restart ${target.name} to pick up the new config
  2. Try asking Claude: "Record a thought about my current project"
  3. Visit ${DASHBOARD_URL} to view your data

Documentation: https://github.com/steig/brain-cloud
`);
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  exit(1);
});
