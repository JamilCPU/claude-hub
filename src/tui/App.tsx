import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp } from "ink";
import WebSocket from "ws";
import {
  ToolCall,
  HubMessage,
  Decision,
  QueueState,
  AgentInfo,
} from "../types.js";
import { HUB_BASE_URL, HUB_PORT } from "../constants.js";
import { StatusBar } from "./components/StatusBar.js";
import { QueueList } from "./components/QueueList.js";
import { ToolCallDetail } from "./components/ToolCallDetail.js";
import { ResolvedLog } from "./components/ResolvedLog.js";
import { AgentSidebar } from "./components/AgentSidebar.js";
import { BulkConfirm } from "./components/BulkConfirm.js";

const WS_URL = `ws://localhost:${HUB_PORT}`;

async function sendDecision(decision: Decision): Promise<void> {
  await fetch(`${HUB_BASE_URL}/api/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(decision),
  });
}

async function sendBulkDecision(
  permissionDecision: "allow" | "deny",
  agentName?: string
): Promise<void> {
  await fetch(`${HUB_BASE_URL}/api/decision/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permissionDecision, agentName }),
  });
}

type BulkPending = {
  message: string;
  action: () => Promise<void>;
};

export function App() {
  const { exit } = useApp();
  const [pending, setPending] = useState<ToolCall[]>([]);
  const [resolved, setResolved] = useState<ToolCall[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [now, setNow] = useState(() => Date.now());
  const [editMode, setEditMode] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [bulkPending, setBulkPending] = useState<BulkPending | null>(null);

  // 1-second clock for countdown timers
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial queue state
  useEffect(() => {
    fetch(`${HUB_BASE_URL}/api/queue`)
      .then((r) => r.json())
      .then((data: QueueState) => {
        setPending(data.pending);
        setResolved(data.resolved);
        setAgents(data.agents ?? []);
      })
      .catch(() => setStatusMsg("Could not reach hub server"));
  }, []);

  // WebSocket for real-time updates
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      ws = new WebSocket(WS_URL);

      ws.on("open", () => {
        setConnected(true);
        setStatusMsg("");
      });

      ws.on("message", (data) => {
        try {
          const msg: HubMessage = JSON.parse(data.toString());

          if (msg.type === "queue-state") {
            setPending(msg.payload as ToolCall[]);
          } else if (msg.type === "tool-call-added") {
            const call = msg.payload as ToolCall;
            setPending((prev) => {
              if (prev.find((c) => c.callId === call.callId)) return prev;
              return [...prev, call];
            });
          } else if (
            msg.type === "tool-call-decided" ||
            msg.type === "tool-call-expired"
          ) {
            const call = msg.payload as ToolCall;
            setPending((prev) => prev.filter((c) => c.callId !== call.callId));
            setResolved((prev) => [call, ...prev].slice(0, 50));
            setSelectedIndex((idx) => Math.max(0, idx - 1));
          } else if (msg.type === "agent-status") {
            setAgents(msg.payload as AgentInfo[]);
          }
        } catch {
          // ignore parse errors
        }
      });

      ws.on("close", () => {
        setConnected(false);
        setStatusMsg("Reconnecting...");
        reconnectTimer = setTimeout(connect, 2000);
      });

      ws.on("error", () => ws.terminate());
    }

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      ws?.terminate();
    };
  }, []);

  // Apply agent filter to visible queue
  const visibleCalls = agentFilter
    ? pending.filter((c) => c.agentName === agentFilter)
    : pending;

  const selectedCall = visibleCalls[selectedIndex];

  // Cycle agent filter with Tab
  const cycleFilter = useCallback(() => {
    const names = agents.map((a) => a.name);
    if (names.length === 0) return;
    if (agentFilter === null) {
      setAgentFilter(names[0]!);
    } else {
      const idx = names.indexOf(agentFilter);
      if (idx === -1 || idx === names.length - 1) {
        setAgentFilter(null);
      } else {
        setAgentFilter(names[idx + 1]!);
      }
    }
    setSelectedIndex(0);
  }, [agents, agentFilter]);

  const approve = useCallback(async () => {
    if (!selectedCall) return;
    setStatusMsg(`Approved: ${selectedCall.toolName}`);
    await sendDecision({ callId: selectedCall.callId, permissionDecision: "allow" });
  }, [selectedCall]);

  const reject = useCallback(async () => {
    if (!selectedCall) return;
    setStatusMsg(`Rejected: ${selectedCall.toolName}`);
    await sendDecision({
      callId: selectedCall.callId,
      permissionDecision: "deny",
      reason: "Rejected by operator",
    });
  }, [selectedCall]);

  const enterEditMode = useCallback(() => {
    if (!selectedCall) return;
    const input = selectedCall.toolInput;
    for (const key of ["command", "cmd", "script", "query", "content"]) {
      if (typeof input[key] === "string") {
        setEditValue(input[key] as string);
        setEditMode(true);
        return;
      }
    }
  }, [selectedCall]);

  const submitEdit = useCallback(async () => {
    if (!selectedCall) return;
    const input = selectedCall.toolInput;
    let editedKey = "";
    for (const key of ["command", "cmd", "script", "query", "content"]) {
      if (typeof input[key] === "string") {
        editedKey = key;
        break;
      }
    }
    setEditMode(false);
    setStatusMsg(`Approved with edit: ${selectedCall.toolName}`);
    await sendDecision({
      callId: selectedCall.callId,
      permissionDecision: "allow",
      updatedInput: { ...input, [editedKey]: editValue },
    });
  }, [selectedCall, editValue]);

  const bulkApproveAgent = useCallback(() => {
    if (!selectedCall) return;
    const { agentName } = selectedCall;
    const count = pending.filter((c) => c.agentName === agentName).length;
    setBulkPending({
      message: `Approve all ${count} pending call(s) from [${agentName}]?`,
      action: () => sendBulkDecision("allow", agentName),
    });
  }, [selectedCall, pending]);

  const bulkApproveAll = useCallback(() => {
    setBulkPending({
      message: `Approve all ${pending.length} pending call(s) from all agents?`,
      action: () => sendBulkDecision("allow"),
    });
  }, [pending]);

  useInput((input, key) => {
    // Edit mode captures all input — handled by TextInput, just handle Esc
    if (editMode) {
      if (key.escape) setEditMode(false);
      return;
    }

    // Bulk confirm dialog captures all input — handled by BulkConfirm
    if (bulkPending) return;

    if (input === "q" || (key.ctrl && input === "c")) exit();
    if (key.tab) cycleFilter();
    if (key.upArrow) setSelectedIndex((i) => Math.max(0, i - 1));
    if (key.downArrow) setSelectedIndex((i) => Math.min(visibleCalls.length - 1, i + 1));
    if (input === "a") approve();
    if (input === "r") reject();
    if (input === "e") enterEditMode();
    if (input === "A") bulkApproveAgent(); // Shift+A
    if (key.ctrl && input === "a") bulkApproveAll();
  });

  const approvedCount = resolved.filter((c) => c.status === "approved").length;
  const rejectedCount = resolved.filter((c) => c.status === "rejected").length;

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box borderStyle="double" paddingX={1} justifyContent="center">
        <Text bold color="cyan">
          claude-hub · Centralized Tool Call Operator
        </Text>
        {agentFilter && (
          <Text color="yellow"> · filter: {agentFilter}</Text>
        )}
      </Box>

      {/* Bulk confirm overlay */}
      {bulkPending && (
        <BulkConfirm
          message={bulkPending.message}
          onConfirm={async () => {
            await bulkPending.action();
            setStatusMsg("Bulk action sent");
            setBulkPending(null);
          }}
          onCancel={() => setBulkPending(null)}
        />
      )}

      {/* Main layout */}
      {!bulkPending && (
        <Box flexGrow={1} gap={0}>
          {/* Agent sidebar (only when agents known) */}
          {agents.length > 0 && (
            <AgentSidebar agents={agents} activeFilter={agentFilter} />
          )}

          {/* Queue list */}
          <Box flexDirection="column" flexGrow={1} minWidth={30}>
            <Box paddingX={1}>
              <Text bold dimColor>
                Pending ({visibleCalls.length}
                {agentFilter ? ` / ${pending.length} total` : ""})
              </Text>
            </Box>
            <QueueList
              calls={visibleCalls}
              selectedIndex={selectedIndex}
              now={now}
            />
          </Box>

          {/* Detail pane */}
          <ToolCallDetail
            call={selectedCall}
            editMode={editMode}
            editValue={editValue}
            onEditChange={setEditValue}
            onEditSubmit={submitEdit}
          />
        </Box>
      )}

      {/* Resolved log */}
      <ResolvedLog calls={resolved} />

      {/* Status bar */}
      <StatusBar
        pendingCount={pending.length}
        approvedCount={approvedCount}
        rejectedCount={rejectedCount}
        connected={connected}
      />

      {/* Status message */}
      {statusMsg && (
        <Box paddingX={1}>
          <Text dimColor>{statusMsg}</Text>
        </Box>
      )}
    </Box>
  );
}
