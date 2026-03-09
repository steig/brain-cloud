import { parseArgs, getFlag, hasFlag } from "../args.js";
import { loadConfig, callTool, configOverrides } from "../client.js";

export async function remind(args: string[]): Promise<void> {
  const { positional, flags } = parseArgs(args);
  const subcommand = positional[0];

  // brain remind done <id>
  if (subcommand === "done") {
    const id = positional[1];
    if (!id) {
      console.error("Usage: brain remind done <id>");
      process.exit(1);
    }
    const config = await loadConfig(configOverrides(flags));
    const result = await callTool(config, "brain_complete_reminder", { id });
    if (hasFlag(flags, "json")) {
      console.log(result);
    } else {
      console.log(`✓ Reminder completed`);
    }
    return;
  }

  // brain remind "content" --in 2d
  const content = positional.join(" ");
  if (!content) {
    console.error('Usage: brain remind "check auth migration" --in 2d');
    console.error("       brain remind done <id>");
    process.exit(1);
  }

  const params: Record<string, unknown> = { content };
  const dueIn = getFlag(flags, "in");
  if (dueIn) params.due_in = dueIn;
  const dueAt = getFlag(flags, "at");
  if (dueAt) params.due_at = dueAt;
  const project = getFlag(flags, "project");
  if (project) params.project = project;

  const config = await loadConfig(configOverrides(flags));
  const result = await callTool(config, "brain_remind", params);

  if (hasFlag(flags, "json")) {
    console.log(result);
  } else {
    const snippet = content.length > 60 ? content.slice(0, 57) + "..." : content;
    console.log(`✓ Reminder set: ${snippet}`);
  }
}

export async function reminders(args: string[]): Promise<void> {
  const { flags } = parseArgs(args);

  const params: Record<string, unknown> = {};
  const status = getFlag(flags, "status");
  if (status) params.status = status;
  const limit = getFlag(flags, "limit");
  if (limit) params.limit = parseInt(limit);

  const config = await loadConfig(configOverrides(flags));
  const result = await callTool(config, "brain_reminders", params);

  if (hasFlag(flags, "json")) {
    console.log(result);
  } else {
    try {
      const parsed = JSON.parse(result);
      if (!parsed.count || parsed.count === 0) {
        console.log("  No reminders found.");
        return;
      }
      console.log(`  ${parsed.count} reminder(s):\n`);
      for (const r of parsed.reminders) {
        const overdue = r.is_overdue ? " [OVERDUE]" : "";
        const due = new Date(r.due_at).toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric",
        });
        console.log(`  ${r.id.slice(0, 8)}  ${due}${overdue}  ${r.content}`);
      }
    } catch {
      console.log(result);
    }
  }
}
