import * as readline from "node:readline/promises";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { stdin as input, stdout as output } from "node:process";

const CONFIG_PATH = path.join(os.homedir(), ".brain-cloud.json");
const DEFAULT_URL = "https://dash.brain-ai.dev";

export async function login(): Promise<void> {
  const rl = readline.createInterface({ input, output });

  try {
    // Check for existing config
    try {
      await fs.access(CONFIG_PATH);
      const overwrite = await rl.question(
        `Config already exists at ${CONFIG_PATH}. Overwrite? (y/N) `,
      );
      if (overwrite.toLowerCase() !== "y") {
        console.log("Aborted.");
        return;
      }
    } catch {
      // File doesn't exist, continue
    }

    const url =
      (await rl.question(`Brain Cloud URL (${DEFAULT_URL}): `)).trim() ||
      DEFAULT_URL;

    const apiKey = (await rl.question("API key: ")).trim();
    if (!apiKey) {
      console.error("Error: API key is required.");
      process.exitCode = 1;
      return;
    }

    // Test connection
    console.log("Testing connection...");
    const res = await fetch(`${url.replace(/\/+$/, "")}/mcp`, {
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

    if (!res.ok) {
      console.error(
        `Error: Connection failed (HTTP ${res.status}). Check your URL and API key.`,
      );
      process.exitCode = 1;
      return;
    }

    // Write config
    await fs.writeFile(
      CONFIG_PATH,
      JSON.stringify({ url, apiKey }, null, 2) + "\n",
      { mode: 0o600 },
    );
    // Ensure permissions even if file existed with different perms
    await fs.chmod(CONFIG_PATH, 0o600);

    console.log(`\nConfig written to ${CONFIG_PATH}`);
    console.log("You're all set! Run `brain` to start using Brain Cloud.");
  } finally {
    rl.close();
  }
}
