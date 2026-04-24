import { ToolCall, AgentInfo } from "../types.js";
import { MAX_RESOLVED_HISTORY } from "../constants.js";

export class ToolCallQueue {
  private pending: Map<string, ToolCall> = new Map();
  private resolved: ToolCall[] = [];
  private agents: Map<string, AgentInfo> = new Map();

  add(call: ToolCall): void {
    this.pending.set(call.callId, call);
    this.touchAgent(call.agentName, true);
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
    this.refreshAgent(call.agentName);
    return call;
  }

  expireCall(callId: string): ToolCall | undefined {
    return this.resolve(callId, "expired");
  }

  /**
   * Returns pending calls interleaved in agent-fair round-robin order.
   * If agent A has [A1,A2,A3] and agent B has [B1,B2], result is [A1,B1,A2,B2,A3].
   */
  getPending(): ToolCall[] {
    const byAgent = new Map<string, ToolCall[]>();
    for (const call of this.pending.values()) {
      const list = byAgent.get(call.agentName) ?? [];
      list.push(call);
      byAgent.set(call.agentName, list);
    }
    // Sort each agent's calls by arrival time
    for (const list of byAgent.values()) {
      list.sort((a, b) => a.timestamp - b.timestamp);
    }
    // Interleave round-robin
    const agentQueues = Array.from(byAgent.values());
    const result: ToolCall[] = [];
    const maxLen = Math.max(0, ...agentQueues.map((q) => q.length));
    for (let i = 0; i < maxLen; i++) {
      for (const q of agentQueues) {
        if (i < q.length) result.push(q[i]!);
      }
    }
    return result;
  }

  getPendingForAgent(agentName: string): ToolCall[] {
    return this.getPending().filter((c) => c.agentName === agentName);
  }

  getResolved(): ToolCall[] {
    return this.resolved;
  }

  getAgents(): AgentInfo[] {
    return Array.from(this.agents.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  private touchAgent(name: string, active: boolean): void {
    const existing = this.agents.get(name);
    this.agents.set(name, {
      name,
      pendingCount: this.getPendingCountForAgent(name),
      lastSeen: Date.now(),
      active: active || (existing?.active ?? false),
    });
  }

  private refreshAgent(name: string): void {
    const existing = this.agents.get(name);
    if (!existing) return;
    const pendingCount = this.getPendingCountForAgent(name);
    this.agents.set(name, {
      ...existing,
      pendingCount,
      // Mark inactive if no more pending and last seen > 30s ago
      active: pendingCount > 0 || Date.now() - existing.lastSeen < 30_000,
    });
  }

  markAgentInactive(agentName: string): void {
    const existing = this.agents.get(agentName);
    if (existing) {
      this.agents.set(agentName, { ...existing, active: false });
    }
  }

  private getPendingCountForAgent(name: string): number {
    let count = 0;
    for (const call of this.pending.values()) {
      if (call.agentName === name) count++;
    }
    return count;
  }
}
