import { parseArgs, getFlag, hasFlag } from "../args.js";
import { loadConfig, callTool, configOverrides } from "../client.js";

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data.trim()));
    process.stdin.on("error", reject);
  });
}

export async function think(args: string[]): Promise<void> {
  const { positional, flags } = parseArgs(args);

  let content = positional.join(" ");
  if (!content && !process.stdin.isTTY) {
    content = await readStdin();
  }
  if (!content) {
    console.error("Usage: brain think <content> [--type note|idea|question|todo|insight] [--tags t1,t2] [--project name] [--json]");
    process.exit(1);
  }

  const params: Record<string, unknown> = { content };
  const type = getFlag(flags, "type");
  if (type) params.type = type;
  const tags = getFlag(flags, "tags");
  if (tags) params.tags = tags.split(",").map((t) => t.trim());
  const project = getFlag(flags, "project");
  if (project) params.project = project;

  const config = await loadConfig(configOverrides(flags));
  const result = await callTool(config, "brain_thought", params);

  if (hasFlag(flags, "json")) {
    console.log(result);
  } else {
    const snippet = content.length > 80 ? content.slice(0, 77) + "..." : content;
    console.log(`✓ Thought recorded: ${snippet}`);
  }
}
