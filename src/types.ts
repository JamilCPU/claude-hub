export type PermissionDecision = "allow" | "deny" | "ask";

export interface ToolCall {
  callId: string;
  sessionId: string;
  agentName: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  timestamp: number;
  expiresAt: number;
  status: "pending" | "approved" | "rejected" | "expired" | "orphaned";
}

export interface Decision {
  callId: string;
  permissionDecision: PermissionDecision;
  reason?: string;
  updatedInput?: Record<string, unknown>;
}

export interface AgentInfo {
  name: string;
  pendingCount: number;
  lastSeen: number;
  active: boolean;
}

export type HubMessageType =
  | "tool-call-added"
  | "tool-call-decided"
  | "tool-call-expired"
  | "queue-state"
  | "agent-status";

export interface HubMessage {
  type: HubMessageType;
  payload: ToolCall | ToolCall[] | Decision | AgentInfo[];
}

export interface QueueState {
  pending: ToolCall[];
  resolved: ToolCall[];
  agents: AgentInfo[];
}
