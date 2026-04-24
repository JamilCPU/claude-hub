#!/usr/bin/env node
/**
 * CLI entry point for claude-hub.
 *
 * Usage:
 *   claude-hub server     — Start the hub server only
 *   claude-hub tui        — Start the TUI console only
 *   claude-hub install    — Install the PreToolUse hook into Claude Code settings
 *   claude-hub            — (default) Print help
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const [, , command] = process.argv;

function run(script: string): void {
  const child = spawn(process.execPath, [join(__dirname, script)], {
    stdio: "inherit",
    env: process.env,
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

switch (command) {
  case "server":
    run("server.js");
    break;
  case "tui":
    run("tui.js");
    break;
  case "install":
    run("install.js");
    break;
  default:
    console.log(`
claude-hub — Centralized tool call operator for multi-agent Claude Code

Usage:
  claude-hub server     Start the hub server (localhost:7900)
  claude-hub tui        Start the TUI console
  claude-hub install    Install PreToolUse hook into ~/.claude/settings.json

Quick start:
  1. claude-hub server   (in a dedicated terminal)
  2. claude-hub tui      (in another dedicated terminal)
  3. claude-hub install  (once, to wire up your Claude Code sessions)
  4. Start Claude Code sessions normally — tool calls appear in the TUI

Environment variables:
  HUB_PORT         Hub server port (default: 7900)
  HUB_TIMEOUT_MS   Seconds before a call auto-expires (default: 300000)
  AGENT_NAME       Override agent name reported to hub (set per terminal)
`);
    break;
}
