export type PermissionDecision = "allow" | "deny" | "ask";

export interface ToolCall {
  callId: string;
  sessionId: string;
  agentName: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  timestamp: number;
  status: "pending" | "approved" | "rejected" | "expired" | "orphaned";
}

export interface Decision {
  callId: string;
  permissionDecision: PermissionDecision;
  reason?: string;
  updatedInput?: Record<string, unknown>;
}

export type HubMessageType =
  | "tool-call-added"
  | "tool-call-decided"
  | "tool-call-expired"
  | "queue-state";

export interface HubMessage {
  type: HubMessageType;
  payload: ToolCall | ToolCall[] | Decision;
}

export interface QueueState {
  pending: ToolCall[];
  resolved: ToolCall[];
}
