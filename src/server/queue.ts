import { ToolCall } from "../types.js";
import { MAX_RESOLVED_HISTORY } from "../constants.js";

export class ToolCallQueue {
  private pending: Map<string, ToolCall> = new Map();
  private resolved: ToolCall[] = [];

  add(call: ToolCall): void {
    this.pending.set(call.callId, call);
  }

  get(callId: string): ToolCall | undefined {
    return this.pending.get(callId);
  }

  resolve(callId: string, status: ToolCall["status"]): ToolCall | undefined {
    const call = this.pending.get(callId);
    if (!call) return undefined;
    call.status = status;
    this.pending.delete(callId);
    this.resolved.unshift(call);
    if (this.resolved.length > MAX_RESOLVED_HISTORY) {
      this.resolved.pop();
    }
    return call;
  }

  getPending(): ToolCall[] {
    return Array.from(this.pending.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );
  }

  getResolved(): ToolCall[] {
    return this.resolved;
  }

  expireCall(callId: string): ToolCall | undefined {
    return this.resolve(callId, "expired");
  }
}
