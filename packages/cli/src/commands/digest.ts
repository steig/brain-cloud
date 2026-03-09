import { parseArgs, getFlag, hasFlag } from "../args.js";
import { loadConfig, callTool, configOverrides } from "../client.js";

export async function digest(args: string[]): Promise<void> {
  const { flags } = parseArgs(args);

  const params: Record<string, unknown> = {};
  const days = getFlag(flags, "days");
  if (days) params.days = parseInt(days);

  const config = await loadConfig(configOverrides(flags));
  const result = await callTool(config, "brain_digest", params);

  if (hasFlag(flags, "json")) {
    console.log(result);
  } else {
    try {
      const parsed = JSON.parse(result);
      if (parsed.formatted) {
        console.log(parsed.formatted);
      } else {
        console.log(result);
      }
    } catch {
      console.log(result);
    }
  }
}
