import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp } from "ink";
import WebSocket from "ws";
import { ToolCall, HubMessage, Decision, QueueState } from "../types.js";
import { HUB_BASE_URL, HUB_PORT } from "../constants.js";
import { StatusBar } from "./components/StatusBar.js";
import { QueueList } from "./components/QueueList.js";
import { ToolCallDetail } from "./components/ToolCallDetail.js";
import { ResolvedLog } from "./components/ResolvedLog.js";

const WS_URL = `ws://localhost:${HUB_PORT}`;

async function sendDecision(decision: Decision): Promise<void> {
  await fetch(`${HUB_BASE_URL}/api/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(decision),
  });
}

export function App() {
  const { exit } = useApp();
  const [pending, setPending] = useState<ToolCall[]>([]);
  const [resolved, setResolved] = useState<ToolCall[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [connected, setConnected] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>("");

  const approvedCount = resolved.filter((c) => c.status === "approved").length;
  const rejectedCount = resolved.filter((c) => c.status === "rejected").length;

  // Fetch initial queue state
  useEffect(() => {
    fetch(`${HUB_BASE_URL}/api/queue`)
      .then((r) => r.json())
      .then((data: QueueState) => {
        setPending(data.pending);
        setResolved(data.resolved);
      })
      .catch(() => {
        setStatusMsg("Could not reach hub server");
      });
  }, []);

  // WebSocket connection for real-time updates
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
            setSelectedIndex((idx) => (idx > 0 ? idx - 1 : 0));
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

      ws.on("error", () => {
        ws.terminate();
      });
    }

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      ws?.terminate();
    };
  }, []);

  const selectedCall = pending[selectedIndex];

  const approve = useCallback(async () => {
    if (!selectedCall) return;
    setStatusMsg(`Approved: ${selectedCall.toolName}`);
    await sendDecision({
      callId: selectedCall.callId,
      permissionDecision: "allow",
    });
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

  useInput((input, key) => {
    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
    }
    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    }
    if (key.downArrow) {
      setSelectedIndex((i) => Math.min(pending.length - 1, i + 1));
    }
    if (input === "a" || input === "A") {
      approve();
    }
    if (input === "r" || input === "R") {
      reject();
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box borderStyle="double" paddingX={1} justifyContent="center">
        <Text bold color="cyan">
          claude-hub · Centralized Tool Call Operator
        </Text>
      </Box>

      {/* Main layout: queue list + detail pane */}
      <Box flexGrow={1} gap={0}>
        <Box flexDirection="column" flexGrow={1} minWidth={30}>
          <Box paddingX={1}>
            <Text bold dimColor>
              Pending ({pending.length})
            </Text>
          </Box>
          <QueueList calls={pending} selectedIndex={selectedIndex} />
        </Box>
        <ToolCallDetail call={selectedCall} />
      </Box>

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
