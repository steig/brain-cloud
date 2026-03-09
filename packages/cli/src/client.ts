/**
 * Brain Cloud MCP client — thin wrapper over JSON-RPC POST to /mcp
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

export interface BrainConfig {
  url: string;
  apiKey: string;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: { content?: Array<{ type: string; text: string }> };
  error?: { code: number; message: string };
}

export function configOverrides(flags: Record<string, string | boolean>): { apiKey?: string; url?: string } {
  const apiKey = typeof flags["api-key"] === "string" ? flags["api-key"] : undefined;
  const url = typeof flags["url"] === "string" ? flags["url"] : undefined;
  return { apiKey, url };
}

export async function loadConfig(overrides?: { apiKey?: string; url?: string }): Promise<BrainConfig> {
  // 1. CLI flags
  if (overrides?.apiKey) {
    return { url: overrides.url || "https://dash.brain-ai.dev", apiKey: overrides.apiKey };
  }

  // 2. Env vars
  const envKey = process.env.BRAIN_API_KEY;
  const envUrl = process.env.BRAIN_URL || process.env.BRAIN_SERVER_URL;
  if (envKey) {
    return { url: envUrl || "https://dash.brain-ai.dev", apiKey: envKey };
  }

  // 3. Config file
  const configPath = join(homedir(), ".brain-cloud.json");
  try {
    const raw = await readFile(configPath, "utf-8");
    const config = JSON.parse(raw) as Partial<BrainConfig>;
    if (!config.apiKey) throw new Error("apiKey missing in ~/.brain-cloud.json");
    return {
      url: config.url || "https://dash.brain-ai.dev",
      apiKey: config.apiKey,
    };
  } catch (e: unknown) {
    const err = e as Error;
    if (err.message.includes("apiKey missing") || err.message.includes("ENOENT")) {
      throw new Error(
        "No Brain Cloud config found. Run `brain login` or set BRAIN_API_KEY env var."
      );
    }
    throw err;
  }
}

export async function callTool(
  config: BrainConfig,
  tool: string,
  params: Record<string, unknown>
): Promise<string> {
  const res = await fetch(`${config.url}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.apiKey,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: tool, arguments: params },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }

  const json = (await res.json()) as JsonRpcResponse;

  if (json.error) {
    throw new Error(`MCP error: ${json.error.message}`);
  }

  const content = json.result?.content;
  if (!content || content.length === 0) return "";

  return content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");
}
