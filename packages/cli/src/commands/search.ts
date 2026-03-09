import { loadConfig, callTool, configOverrides } from "../client.js";
import { parseArgs, getFlag, hasFlag } from "../args.js";

export async function recall(args: string[]): Promise<void> {
  const parsed = parseArgs(args);
  const query = parsed.positional.join(" ").trim();

  if (!query) {
    console.error("Usage: brain recall <topic> [--project name] [--limit 10] [--json]");
    process.exit(1);
  }

  const project = getFlag(parsed.flags, "project");
  const limit = getFlag(parsed.flags, "limit");
  const json = hasFlag(parsed.flags, "json");

  const config = await loadConfig(configOverrides(parsed.flags));
  const params: Record<string, unknown> = { query, include_details: true };
  if (project) params.project = project;
  if (limit) params.limit = Number(limit);

  const result = await callTool(config, "brain_recall", params);

  if (json) {
    console.log(result);
  } else if (!result || result === "No results found.") {
    console.log("No results found.");
  } else {
    console.log(result);
  }
}

export async function search(args: string[]): Promise<void> {
  const parsed = parseArgs(args);
  const query = parsed.positional.join(" ").trim();

  if (!query) {
    console.error("Usage: brain search <query> [--project name] [--limit 20] [--json]");
    process.exit(1);
  }

  const project = getFlag(parsed.flags, "project");
  const limit = getFlag(parsed.flags, "limit");
  const json = hasFlag(parsed.flags, "json");

  const config = await loadConfig(configOverrides(parsed.flags));
  const params: Record<string, unknown> = { query };
  if (project) params.project = project;
  if (limit) params.limit = Number(limit);

  const result = await callTool(config, "brain_search", params);

  if (json) {
    console.log(result);
  } else if (!result || result === "No results found.") {
    console.log("No results found.");
  } else {
    console.log(result);
  }
}
