#!/usr/bin/env node

import { exit } from "node:process";
import { login } from "./commands/login.js";
import { think } from "./commands/think.js";
import { decide } from "./commands/decide.js";
import { recall, search } from "./commands/search.js";
import { timeline } from "./commands/timeline.js";
import { remind, reminders } from "./commands/remind.js";
import { digest } from "./commands/digest.js";

const VERSION = "1.1.0";

const HELP = `
  brain — CLI for Brain Cloud

  Usage:
    brain <command> [options]

  Commands:
    think <content>       Log a thought, idea, or note
    decide <title>        Log a decision with rationale
    recall <topic>        Recall past thoughts & decisions on a topic
    search <query>        Full-text search across all entries
    timeline              Recent activity feed
    remind <content>      Set a reminder (--in 2d, --at 2024-01-15)
    remind done <id>      Mark a reminder as completed
    reminders             List pending reminders (--status pending|completed|dismissed)
    digest                Weekly activity digest (--days 30)
    login                 Set up Brain Cloud credentials
    version               Print version

  Options:
    --help, -h            Show help
    --json                Output as JSON (where supported)
    --project <name>      Project context
    --api-key <key>       Override API key
    --url <url>           Override Brain Cloud URL

  Config:
    Reads from (in order): --api-key/--url flags, BRAIN_API_KEY/BRAIN_URL env vars, ~/.brain-cloud.json
    Run \`brain login\` for interactive setup.
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    console.log(HELP);
    return;
  }

  if (command === "version" || command === "--version" || command === "-v") {
    console.log(VERSION);
    return;
  }

  switch (command) {
    case "login":
      return login();
    case "think":
      return think(args.slice(1));
    case "decide":
      return decide(args.slice(1));
    case "recall":
      return recall(args.slice(1));
    case "search":
      return search(args.slice(1));
    case "timeline":
      return timeline(args.slice(1));
    case "remind":
      return remind(args.slice(1));
    case "reminders":
      return reminders(args.slice(1));
    case "digest":
      return digest(args.slice(1));
    default:
      console.error(`  Unknown command: ${command}\n  Run \`brain --help\` for usage.`);
      exit(1);
  }
}

main().catch((err: Error) => {
  console.error(`  Error: ${err.message}`);
  exit(1);
});
