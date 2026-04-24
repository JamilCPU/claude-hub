/**
 * install.ts
 *
 * Installs the claude-hub PreToolUse hook into ~/.claude/settings.json.
 * Creates a backup before modifying.
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// The hook-bridge script that Claude Code will invoke
const hookBridgePath = resolve(join(__dirname, "hook-bridge.js"));
const settingsPath = join(homedir(), ".claude", "settings.json");

interface HookConfig {
  type: string;
  command: string;
}

interface HooksConfig {
  PreToolUse?: HookConfig[];
  [key: string]: unknown;
}

interface Settings {
  hooks?: HooksConfig;
  [key: string]: unknown;
}

function loadSettings(): Settings {
  if (!existsSync(settingsPath)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(settingsPath, "utf8")) as Settings;
  } catch {
    console.error(`Could not parse ${settingsPath}. Aborting.`);
    process.exit(1);
  }
}

function saveSettings(settings: Settings): void {
  if (existsSync(settingsPath)) {
    const backupPath = `${settingsPath}.claude-hub-backup`;
    copyFileSync(settingsPath, backupPath);
    console.log(`Backup saved to: ${backupPath}`);
  }
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
}

function isHookAlreadyInstalled(settings: Settings): boolean {
  const hooks = settings.hooks?.PreToolUse ?? [];
  return hooks.some((h) => h.command?.includes("hook-bridge"));
}

const settings = loadSettings();

if (isHookAlreadyInstalled(settings)) {
  console.log("claude-hub hook is already installed in settings.json.");
  console.log(
    "If you need to update the path, remove the existing hook entry and re-run."
  );
  process.exit(0);
}

if (!settings.hooks) settings.hooks = {};
if (!settings.hooks.PreToolUse) settings.hooks.PreToolUse = [];

settings.hooks.PreToolUse.push({
  type: "command",
  command: `node "${hookBridgePath}"`,
});

saveSettings(settings);

console.log(`
claude-hub hook installed successfully!

Hook added to: ${settingsPath}
Hook script:   ${hookBridgePath}

Next steps:
  1. Start the hub:  claude-hub server  (in a dedicated terminal)
  2. Start the TUI:  claude-hub tui     (in another dedicated terminal)
  3. Open Claude Code normally — tool calls will appear in the TUI

To set a custom agent name per terminal:
  AGENT_NAME=my-agent claude

To uninstall, remove the hook entry from: ${settingsPath}
`);
