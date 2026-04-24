#!/usr/bin/env node
/**
 * hook-bridge.ts
 *
 * This script is invoked by Claude Code's PreToolUse hook for every tool call.
 * It forwards the tool call to the hub server and blocks until the user decides.
 * If the hub is unreachable, it falls back to "ask" (normal Claude Code behavior).
 *
 * Claude Code sets these environment variables:
 *   CLAUDE_TOOL_USE_ID   - unique ID for this tool call
 *   CLAUDE_TOOL_NAME     - name of the tool (Bash, Read, Write, etc.)
 *   CLAUDE_SESSION_ID    - session identifier
 *
 * Tool input is provided via stdin as JSON.
 * The decision is written to stdout as JSON.
 */

import { HUB_BASE_URL, HUB_TIMEOUT_MS } from "./constants.js";
import { PermissionDecision } from "./types.js";

function fallback(decision: PermissionDecision = "ask", reason?: string): void {
  const output: Record<string, unknown> = { permissionDecision: decision };
  if (reason) output.reason = reason;
  process.stdout.write(JSON.stringify(output) + "\n");
  process.exit(0);
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    // If stdin closes immediately (no piped data), resolve empty
    setTimeout(() => resolve(data), 100);
  });
}

async function main() {
  const toolUseId = process.env.CLAUDE_TOOL_USE_ID ?? "";
  const toolName = process.env.CLAUDE_TOOL_NAME ?? "unknown";
  const sessionId = process.env.CLAUDE_SESSION_ID ?? "unknown";
  const agentName =
    process.env.AGENT_NAME ??
    process.env.CLAUDE_SESSION_DIR?.split(/[\\/]/).pop() ??
    `agent-${sessionId.slice(0, 6)}`;

  let toolInput: Record<string, unknown> = {};
  try {
    const raw = await readStdin();
    if (raw.trim()) {
      const parsed = JSON.parse(raw);
      // Claude Code sends { tool_name, tool_input } or just the input directly
      toolInput = parsed.tool_input ?? parsed ?? {};
    }
  } catch {
    // Non-JSON stdin is fine — just use empty input
  }

  const callId = `${sessionId}:${toolUseId}`;

  const body = JSON.stringify({
    callId,
    sessionId,
    agentName,
    toolName,
    toolInput,
    timestamp: Date.now(),
  });

  try {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(
      () => controller.abort(),
      HUB_TIMEOUT_MS + 5000
    );

    const response = await fetch(`${HUB_BASE_URL}/api/tool-call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutHandle);

    if (!response.ok) {
      fallback("ask", `Hub returned ${response.status}`);
      return;
    }

    const result = (await response.json()) as {
      permissionDecision: PermissionDecision;
      reason?: string;
      updatedInput?: Record<string, unknown>;
    };

    const output: Record<string, unknown> = {
      permissionDecision: result.permissionDecision,
    };
    if (result.reason) output.reason = result.reason;
    if (result.updatedInput) output.updatedInput = result.updatedInput;

    process.stdout.write(JSON.stringify(output) + "\n");
    process.exit(0);
  } catch (err) {
    // Hub unreachable or request aborted — fail open
    fallback("ask");
  }
}

main();
