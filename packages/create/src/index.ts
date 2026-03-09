#!/usr/bin/env node

import { createInterface } from "node:readline/promises";
import { stdin, stdout, platform, exit } from "node:process";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { execSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";

const REPO_URL = "https://github.com/steig/brain-cloud.git";

const BANNER = `
  ____            _        ____ _                 _
 | __ ) _ __ __ _(_)_ __  / ___| | ___  _   _  __| |
 |  _ \\| '__/ _\` | | '_ \\| |   | |/ _ \\| | | |/ _\` |
 | |_) | | | (_| | | | | | |___| | (_) | |_| | (_| |
 |____/|_|  \\__,_|_|_| |_|\\____|_|\\___/ \\__,_|\\__,_|

  Self-Hosted Setup
`;

interface StepResult {
  databaseId?: string;
  vectorizeCreated?: boolean;
  workersAiEnabled?: boolean;
  deployUrl?: string;
  oauthProvider?: string;
}

function run(cmd: string, cwd?: string): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch (e: unknown) {
    const err = e as { stderr?: string; message?: string };
    throw new Error(err.stderr || err.message || "Command failed");
  }
}

function runInteractive(cmd: string, cwd?: string): boolean {
  const result = spawnSync(cmd, { cwd, shell: true, stdio: "inherit" });
  return result.status === 0;
}

function hasCommand(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function log(msg: string) {
  console.log(`  ${msg}`);
}

function step(msg: string) {
  console.log(`\n→ ${msg}`);
}

function success(msg: string) {
  console.log(`  ✓ ${msg}`);
}

function warn(msg: string) {
  console.log(`  ⚠ ${msg}`);
}

function fail(msg: string): never {
  console.error(`\n  ✗ ${msg}\n`);
  exit(1);
}

async function checkPrerequisites(): Promise<void> {
  step("Checking prerequisites");

  // Node.js version
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1), 10);
  if (major < 18) {
    fail(`Node.js 18+ required (found ${nodeVersion}). Install from https://nodejs.org/`);
  }
  success(`Node.js ${nodeVersion}`);

  // pnpm
  if (!hasCommand("pnpm")) {
    fail("pnpm is required. Install: npm i -g pnpm");
  }
  const pnpmVersion = run("pnpm --version");
  success(`pnpm ${pnpmVersion}`);

  // wrangler
  if (!hasCommand("wrangler")) {
    fail("Wrangler CLI is required. Install: npm i -g wrangler");
  }
  const wranglerVersion = run("wrangler --version").replace("wrangler ", "");
  success(`Wrangler ${wranglerVersion}`);

  // Check wrangler auth
  try {
    run("wrangler whoami");
    success("Cloudflare authenticated");
  } catch {
    fail("Not logged in to Cloudflare. Run: wrangler login");
  }

  // git
  if (!hasCommand("git")) {
    fail("git is required. Install from https://git-scm.com/");
  }
  success("git available");
}

async function cloneRepo(targetDir: string): Promise<string> {
  step("Cloning Brain Cloud");

  if (await fileExists(targetDir)) {
    log(`Directory ${targetDir} already exists — using existing clone`);
    // Pull latest
    try {
      run("git pull origin main", targetDir);
      success("Updated to latest");
    } catch {
      warn("Could not pull latest (offline or dirty tree). Continuing with existing code.");
    }
  } else {
    log(`Cloning ${REPO_URL} → ${targetDir}`);
    run(`git clone ${REPO_URL} ${targetDir}`);
    success("Cloned successfully");
  }

  step("Installing dependencies");
  if (!runInteractive("pnpm install", targetDir)) {
    fail("pnpm install failed");
  }
  success("Dependencies installed");

  return targetDir;
}

async function createD1Database(cwd: string): Promise<string> {
  step("Creating D1 database");

  const output = run("wrangler d1 create brain-db", cwd);
  // Parse database_id from output like: database_id = "abc-123-def"
  const match = output.match(/database_id\s*=\s*"([^"]+)"/);
  if (!match) {
    // Database might already exist
    if (output.includes("already exists")) {
      warn("Database 'brain-db' already exists. Enter your existing database_id.");
      return ""; // Caller will prompt
    }
    fail(`Could not parse database_id from wrangler output:\n${output}`);
  }

  const dbId = match[1];
  success(`Created D1 database: ${dbId}`);
  return dbId;
}

async function generateWranglerToml(
  cwd: string,
  databaseId: string,
  opts: { vectorize: boolean; workersAi: boolean; frontendUrl?: string }
): Promise<void> {
  step("Generating wrangler.toml");

  const workerDir = join(cwd, "packages", "worker");
  const templatePath = join(cwd, "wrangler.toml.template");
  const outputPath = join(workerDir, "wrangler.toml");

  if (await fileExists(outputPath)) {
    warn("wrangler.toml already exists — skipping generation");
    return;
  }

  let template = await readFile(templatePath, "utf-8");

  // Replace database_id placeholder
  template = template.replace(/database_id\s*=\s*"YOUR_D1_DATABASE_ID"/, `database_id = "${databaseId}"`);

  // Set FRONTEND_URL if provided
  if (opts.frontendUrl) {
    template = template.replace(
      /FRONTEND_URL\s*=\s*"[^"]*"/,
      `FRONTEND_URL = "${opts.frontendUrl}"`
    );
    // Also set JWT_ISSUER
    const issuer = new URL(opts.frontendUrl).hostname;
    template = template.replace(
      /JWT_ISSUER\s*=\s*"[^"]*"/,
      `JWT_ISSUER = "${issuer}"`
    );
  }

  // Enable Vectorize if requested
  if (opts.vectorize) {
    template = template.replace(
      /# \[\[vectorize\]\]\n# binding = "VECTORIZE"\n# index_name = "brain-embeddings"/,
      '[[vectorize]]\nbinding = "VECTORIZE"\nindex_name = "brain-embeddings"'
    );
  }

  // Enable Workers AI if requested
  if (opts.workersAi) {
    template = template.replace(
      /# \[ai\]\n# binding = "AI"/,
      '[ai]\nbinding = "AI"'
    );
  }

  await writeFile(outputPath, template, "utf-8");
  success(`Generated ${outputPath}`);
}

async function runMigrations(cwd: string): Promise<void> {
  step("Running database migrations");

  const workerDir = join(cwd, "packages", "worker");
  if (!runInteractive("wrangler d1 migrations apply brain-db --remote", workerDir)) {
    fail("Migration failed. Check the error above and try again.");
  }
  success("Migrations applied");
}

async function setSecrets(cwd: string, opts: { github: boolean; google: boolean }): Promise<void> {
  step("Setting secrets");

  const workerDir = join(cwd, "packages", "worker");

  // Auto-generate JWT_SECRET
  const jwtSecret = randomBytes(32).toString("hex");
  run(`echo "${jwtSecret}" | wrangler secret put JWT_SECRET`, workerDir);
  success("JWT_SECRET set (auto-generated)");

  if (opts.github) {
    log("Set your GitHub OAuth credentials:");
    if (!runInteractive("wrangler secret put GITHUB_CLIENT_ID", workerDir)) {
      warn("Failed to set GITHUB_CLIENT_ID — you can set it later");
    }
    if (!runInteractive("wrangler secret put GITHUB_CLIENT_SECRET", workerDir)) {
      warn("Failed to set GITHUB_CLIENT_SECRET — you can set it later");
    }
  }

  if (opts.google) {
    log("Set your Google OAuth credentials:");
    if (!runInteractive("wrangler secret put GOOGLE_CLIENT_ID", workerDir)) {
      warn("Failed to set GOOGLE_CLIENT_ID — you can set it later");
    }
    if (!runInteractive("wrangler secret put GOOGLE_CLIENT_SECRET", workerDir)) {
      warn("Failed to set GOOGLE_CLIENT_SECRET — you can set it later");
    }
  }

  if (!opts.github && !opts.google) {
    success("API-key-only mode — no OAuth secrets needed");
  }
}

async function buildAndDeploy(cwd: string): Promise<string> {
  step("Building web dashboard");
  if (!runInteractive("pnpm --filter brain-web build", cwd)) {
    fail("Web build failed. Check the error above.");
  }
  success("Web dashboard built");

  step("Deploying to Cloudflare Workers");
  const workerDir = join(cwd, "packages", "worker");
  const output = run("wrangler deploy", workerDir);

  // Parse URL from deploy output
  const urlMatch = output.match(/https:\/\/[^\s]+\.workers\.dev/);
  const url = urlMatch ? urlMatch[0] : "your-instance.workers.dev";
  success(`Deployed to ${url}`);

  return url;
}

async function configureMcpClient(
  deployUrl: string,
  rl: ReturnType<typeof createInterface>
): Promise<void> {
  step("Configure MCP client (optional)");

  const answer = await rl.question("  Set up Claude Code / Desktop config now? (y/n): ");
  if (!answer.toLowerCase().startsWith("y")) {
    log("Skipping — you can configure MCP later from the dashboard.");
    return;
  }

  log("You'll need an API key from your new instance.");
  log(`Visit ${deployUrl}/settings to create one, then come back.`);

  const apiKey = (await rl.question("  Paste your API key: ")).trim();
  if (!apiKey) {
    warn("No API key provided. You can configure MCP later.");
    return;
  }

  const mcpConfig = {
    mcpServers: {
      "brain-cloud": {
        type: "url",
        url: `${deployUrl}/mcp`,
        headers: { "X-API-Key": apiKey },
      },
    },
  };

  // Claude Code config
  const claudeCodePath = join(homedir(), ".claude", "settings.json");
  try {
    let config: Record<string, unknown> = {};
    if (await fileExists(claudeCodePath)) {
      config = JSON.parse(await readFile(claudeCodePath, "utf-8"));
    }
    const servers = (config.mcpServers as Record<string, unknown>) ?? {};
    servers["brain-cloud"] = mcpConfig.mcpServers["brain-cloud"];
    config.mcpServers = servers;
    await mkdir(join(claudeCodePath, ".."), { recursive: true });
    await writeFile(claudeCodePath, JSON.stringify(config, null, 2) + "\n", "utf-8");
    success(`Claude Code config written to ${claudeCodePath}`);
  } catch (e: unknown) {
    const err = e as Error;
    warn(`Could not write Claude Code config: ${err.message}`);
  }

  // Claude Desktop config
  let desktopPath: string;
  if (platform === "darwin") {
    desktopPath = join(homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");
  } else {
    desktopPath = join(homedir(), ".config", "Claude", "claude_desktop_config.json");
  }

  if (await fileExists(desktopPath)) {
    try {
      const config = JSON.parse(await readFile(desktopPath, "utf-8")) as Record<string, unknown>;
      const servers = (config.mcpServers as Record<string, unknown>) ?? {};
      servers["brain-cloud"] = mcpConfig.mcpServers["brain-cloud"];
      config.mcpServers = servers;
      await writeFile(desktopPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
      success(`Claude Desktop config written to ${desktopPath}`);
    } catch (e: unknown) {
      const err = e as Error;
      warn(`Could not write Claude Desktop config: ${err.message}`);
    }
  }
}

async function update(): Promise<void> {
  console.log(`
  ────────────────────────────────
   Brain Cloud — Update
  ────────────────────────────────
`);

  const cwd = process.argv[3] || process.cwd();

  // Verify this is a brain-cloud install
  step("Verifying Brain Cloud installation");
  if (!(await fileExists(join(cwd, "packages", "worker", "wrangler.toml")))) {
    fail(`Not a Brain Cloud install (no packages/worker/wrangler.toml in ${cwd})`);
  }
  success("Brain Cloud installation found");

  // Pull latest
  step("Pulling latest changes");
  if (!runInteractive("git pull origin main", cwd)) {
    fail("git pull failed. Resolve conflicts or stash changes first.");
  }
  success("Up to date");

  // Install dependencies
  step("Installing dependencies");
  if (!runInteractive("pnpm install", cwd)) {
    fail("pnpm install failed");
  }
  success("Dependencies installed");

  // Run migrations (idempotent)
  step("Running database migrations");
  const workerDir = join(cwd, "packages", "worker");
  if (!runInteractive("wrangler d1 migrations apply brain-db --remote", workerDir)) {
    fail("Migrations failed. Check the error above.");
  }
  success("Migrations applied");

  // Build web dashboard
  step("Building web dashboard");
  if (!runInteractive("pnpm --filter brain-web build", cwd)) {
    fail("Web build failed. Check the error above.");
  }
  success("Web dashboard built");

  // Deploy
  step("Deploying to Cloudflare Workers");
  const deployOutput = run("wrangler deploy", workerDir);
  const urlMatch = deployOutput.match(/https:\/\/[^\s]+\.workers\.dev/);
  const url = urlMatch ? urlMatch[0] : "your-instance.workers.dev";
  success(`Deployed to ${url}`);

  // Check version
  step("Verifying deployment");
  try {
    const res = await fetch(`${url}/version`);
    if (res.ok) {
      const versionOutput = await res.text();
      success(`Live version: ${versionOutput.trim()}`);
    } else {
      warn(`/version returned HTTP ${res.status} — deploy may still be propagating`);
    }
  } catch {
    warn("Could not reach /version endpoint — deploy may still be propagating");
  }

  console.log(`
  ✓ Update complete!
  ${url}
`);
}

async function main(): Promise<void> {
  // Route subcommands
  if (process.argv[2] === "update") {
    return update();
  }

  console.log(BANNER);

  const rl = createInterface({ input: stdin, output: stdout });

  try {
    // Prerequisites
    await checkPrerequisites();

    // Target directory
    const defaultDir = join(process.cwd(), "brain-cloud");
    const dirAnswer = await rl.question(`\n  Install directory (${defaultDir}): `);
    const targetDir = dirAnswer.trim() || defaultDir;

    // Clone
    const cwd = await cloneRepo(targetDir);

    // Create D1
    let databaseId: string;
    try {
      databaseId = await createD1Database(cwd);
    } catch (e: unknown) {
      const err = e as Error;
      if (err.message.includes("already exists")) {
        databaseId = "";
      } else {
        throw e;
      }
    }

    if (!databaseId) {
      databaseId = (await rl.question("  Enter your D1 database_id: ")).trim();
      if (!databaseId) fail("Database ID is required.");
    }

    // Optional features
    const vectorizeAnswer = await rl.question("\n  Enable semantic search (Vectorize)? (y/n): ");
    const enableVectorize = vectorizeAnswer.toLowerCase().startsWith("y");

    if (enableVectorize) {
      step("Creating Vectorize index");
      try {
        run("wrangler vectorize create brain-embeddings --dimensions 768 --metric cosine", cwd);
        success("Vectorize index created");
      } catch (e: unknown) {
        const err = e as Error;
        if (err.message.includes("already exists")) {
          warn("Index already exists — reusing");
        } else {
          warn(`Could not create Vectorize index: ${err.message}`);
        }
      }
    }

    const aiAnswer = await rl.question("  Enable AI coaching & digests (Workers AI)? (y/n): ");
    const enableAi = aiAnswer.toLowerCase().startsWith("y");

    // Domain (optional)
    const domainAnswer = await rl.question("\n  Custom domain (leave blank for workers.dev): ");
    const frontendUrl = domainAnswer.trim()
      ? `https://${domainAnswer.trim().replace(/^https?:\/\//, "")}`
      : undefined;

    // Generate wrangler.toml
    await generateWranglerToml(cwd, databaseId, {
      vectorize: enableVectorize,
      workersAi: enableAi,
      frontendUrl,
    });

    // Migrations
    await runMigrations(cwd);

    // OAuth
    step("OAuth setup");
    const oauthAnswer = await rl.question("  Set up OAuth? (github/google/none): ");
    const oauthChoice = oauthAnswer.trim().toLowerCase();

    await setSecrets(cwd, {
      github: oauthChoice === "github" || oauthChoice === "both",
      google: oauthChoice === "google" || oauthChoice === "both",
    });

    // Build & deploy
    const deployUrl = await buildAndDeploy(cwd);

    // Configure MCP
    await configureMcpClient(deployUrl, rl);

    // Done!
    console.log(`
  ┌─────────────────────────────────────────────┐
  │                                             │
  │   Brain Cloud is live!                      │
  │                                             │
  │   URL: ${deployUrl.padEnd(36)}│
  │                                             │
  │   Next steps:                               │
  │   1. Visit the URL above                    │
  │   2. Sign in (first user = admin)           │
  │   3. Create an API key in Settings          │
  │   4. Add MCP config to Claude Code          │
  │                                             │
  │   Docs: ${deployUrl}/docs${" ".repeat(Math.max(0, 24 - deployUrl.length))}│
  │                                             │
  └─────────────────────────────────────────────┘
`);
  } finally {
    rl.close();
  }
}

main().catch((err: Error) => {
  console.error(`\n  ✗ ${err.message}\n`);
  exit(1);
});
