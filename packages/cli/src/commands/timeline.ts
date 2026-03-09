import { loadConfig, callTool, configOverrides } from "../client.js";
import { parseArgs, getFlag, hasFlag } from "../args.js";

export async function timeline(args: string[]): Promise<void> {
  const { flags } = parseArgs(args);

  const days = getFlag(flags, "days");
  const limit = getFlag(flags, "limit");
  const project = getFlag(flags, "project");
  const jsonOutput = hasFlag(flags, "json");

  const config = await loadConfig(configOverrides(flags));

  const params: Record<string, unknown> = {};
  if (days) params.days = Number(days);
  if (limit) params.limit = Number(limit);
  if (project) params.project = project;

  const result = await callTool(config, "brain_timeline", params);

  if (!result) {
    console.log("No activity found.");
    return;
  }

  console.log(result);
}
