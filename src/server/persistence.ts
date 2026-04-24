/**
 * persistence.ts — append-only JSONL audit log
 *
 * Writes every tool call and decision to ~/.claude-hub/audit.jsonl.
 * Used for audit review and crash recovery of un-expired pending calls.
 */

import { appendFileSync, existsSync, readFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { ToolCall, Decision } from "../types.js";

const hubDir = join(homedir(), ".claude-hub");
const auditPath = join(hubDir, "audit.jsonl");

function ensureDir(): void {
  if (!existsSync(hubDir)) {
    mkdirSync(hubDir, { recursive: true });
  }
}

function append(record: Record<string, unknown>): void {
  try {
    ensureDir();
    appendFileSync(auditPath, JSON.stringify(record) + "\n", "utf8");
  } catch {
    // Non-fatal: audit log is best-effort
  }
}

export function logCallAdded(call: ToolCall): void {
  append({ type: "call-added", call, ts: Date.now() });
}

export function logDecision(callId: string, decision: Decision): void {
  append({ type: "decision", callId, decision, ts: Date.now() });
}

export function logExpired(callId: string): void {
  append({ type: "expired", callId, ts: Date.now() });
}

/**
 * Returns any calls from the audit log that were pending (not decided/expired)
 * and whose expiresAt is still in the future. Useful for hub restart recovery.
 */
export function loadRecoverableCalls(): ToolCall[] {
  if (!existsSync(auditPath)) return [];
  try {
    const lines = readFileSync(auditPath, "utf8").trim().split("\n");
    const calls = new Map<string, ToolCall>();
    const decided = new Set<string>();

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const record = JSON.parse(line) as {
          type: string;
          call?: ToolCall;
          callId?: string;
        };
        if (record.type === "call-added" && record.call) {
          calls.set(record.call.callId, record.call);
        } else if (
          (record.type === "decision" || record.type === "expired") &&
          record.callId
        ) {
          decided.add(record.callId);
        }
      } catch {
        // Skip malformed lines
      }
    }

    const now = Date.now();
    const recoverable: ToolCall[] = [];
    for (const [callId, call] of calls) {
      if (!decided.has(callId) && call.expiresAt > now) {
        recoverable.push({ ...call, status: "pending" });
      }
    }
    return recoverable;
  } catch {
    return [];
  }
}
