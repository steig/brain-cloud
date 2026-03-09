import { loadConfig, callTool, configOverrides } from "../client.js";
import { parseArgs, getFlag, hasFlag } from "../args.js";

export async function decide(args: string[]): Promise<void> {
  const parsed = parseArgs(args);
  const title = parsed.positional.join(" ").trim();
  const chosen = getFlag(parsed.flags, "chosen");
  const rationale = getFlag(parsed.flags, "rationale");
  const optionsRaw = getFlag(parsed.flags, "options");
  const tags = getFlag(parsed.flags, "tags");
  const project = getFlag(parsed.flags, "project");
  const json = hasFlag(parsed.flags, "json");

  if (!title || !chosen || !rationale) {
    console.error(
      "Usage: brain decide <title> --chosen <option> --rationale <text> [--options opt1,opt2] [--tags tag1,tag2] [--project name] [--json]"
    );
    process.exit(1);
  }

  const config = await loadConfig(configOverrides(parsed.flags));
  const params: Record<string, unknown> = { title, chosen, rationale };

  if (optionsRaw) {
    params.options = optionsRaw
      .split(",")
      .map((o) => ({ option: o.trim(), pros: [], cons: [] }));
  }
  if (tags) {
    params.tags = tags.split(",").map((t) => t.trim());
  }
  if (project) {
    params.project = project;
  }

  const result = await callTool(config, "brain_decide", params);

  if (json) {
    console.log(result);
  } else {
    console.log(`✓ Decision recorded: ${title}`);
  }
}
