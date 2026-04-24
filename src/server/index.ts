import express, { Request, Response } from "express";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { ToolCallQueue } from "./queue.js";
import { ToolCall, Decision, HubMessage } from "../types.js";
import { HUB_PORT, HUB_TIMEOUT_MS } from "../constants.js";

const app = express();
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });
const queue = new ToolCallQueue();

// Map of callId -> { res (HTTP response to hold), timeoutHandle }
const pendingResponses = new Map<
  string,
  { res: Response; timeoutHandle: ReturnType<typeof setTimeout> }
>();

// Broadcast a message to all connected TUI clients
function broadcast(msg: HubMessage): void {
  const data = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

// POST /api/tool-call — called by hook-bridge, held open until decision
app.post("/api/tool-call", (req: Request, res: Response) => {
  const call: ToolCall = {
    callId: req.body.callId,
    sessionId: req.body.sessionId,
    agentName: req.body.agentName ?? "unknown",
    toolName: req.body.toolName ?? "unknown",
    toolInput: req.body.toolInput ?? {},
    timestamp: req.body.timestamp ?? Date.now(),
    status: "pending",
  };

  if (!call.callId) {
    res.status(400).json({ error: "callId required" });
    return;
  }

  queue.add(call);

  // Notify TUI
  broadcast({ type: "tool-call-added", payload: call });

  // Hold the response open until user decides or timeout fires
  const timeoutHandle = setTimeout(() => {
    const pending = pendingResponses.get(call.callId);
    if (pending) {
      pendingResponses.delete(call.callId);
      queue.expireCall(call.callId);
      broadcast({
        type: "tool-call-expired",
        payload: { ...call, status: "expired" },
      });
      // Fail open: let Claude Code show its own prompt
      pending.res.json({ permissionDecision: "ask" });
    }
  }, HUB_TIMEOUT_MS);

  pendingResponses.set(call.callId, { res, timeoutHandle });

  // Clean up if the hook-bridge disconnects before we respond
  req.on("close", () => {
    if (pendingResponses.has(call.callId)) {
      clearTimeout(pendingResponses.get(call.callId)!.timeoutHandle);
      pendingResponses.delete(call.callId);
      queue.resolve(call.callId, "orphaned");
      broadcast({
        type: "tool-call-decided",
        payload: { ...call, status: "orphaned" },
      });
    }
  });
});

// POST /api/decision — called by TUI with user's approve/reject
app.post("/api/decision", (req: Request, res: Response) => {
  const decision: Decision = req.body;

  if (!decision.callId) {
    res.status(400).json({ error: "callId required" });
    return;
  }

  const pending = pendingResponses.get(decision.callId);
  if (!pending) {
    res.status(404).json({ error: "No pending call for that callId" });
    return;
  }

  clearTimeout(pending.timeoutHandle);
  pendingResponses.delete(decision.callId);

  const status =
    decision.permissionDecision === "allow" ? "approved" : "rejected";
  const resolvedCall = queue.resolve(decision.callId, status);

  if (resolvedCall) {
    broadcast({ type: "tool-call-decided", payload: resolvedCall });
  }

  // Respond to the waiting hook-bridge
  const hookResponse: Record<string, unknown> = {
    permissionDecision: decision.permissionDecision,
  };
  if (decision.reason) hookResponse.reason = decision.reason;
  if (decision.updatedInput) hookResponse.updatedInput = decision.updatedInput;

  pending.res.json(hookResponse);
  res.json({ ok: true });
});

// GET /api/queue — TUI fetches initial state on connect
app.get("/api/queue", (_req: Request, res: Response) => {
  res.json({
    pending: queue.getPending(),
    resolved: queue.getResolved(),
  });
});

// GET /api/health
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true, pending: queue.getPending().length });
});

// WebSocket: push real-time events to TUI
wss.on("connection", (ws) => {
  // Send current queue state on connect
  const msg: HubMessage = {
    type: "queue-state",
    payload: queue.getPending(),
  };
  ws.send(JSON.stringify(msg));
});

server.listen(HUB_PORT, () => {
  console.log(`claude-hub server listening on http://localhost:${HUB_PORT}`);
  console.log(`  Health: http://localhost:${HUB_PORT}/api/health`);
  console.log(`  Press Ctrl+C to stop`);
});

// Graceful shutdown: expire all pending calls
process.on("SIGINT", () => {
  for (const [callId, { res, timeoutHandle }] of pendingResponses) {
    clearTimeout(timeoutHandle);
    res.json({ permissionDecision: "ask" });
    queue.expireCall(callId);
  }
  process.exit(0);
});
