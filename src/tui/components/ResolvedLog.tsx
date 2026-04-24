import React from "react";
import { Box, Text } from "ink";
import { ToolCall } from "../../types.js";

interface Props {
  calls: ToolCall[];
}

function statusColor(status: ToolCall["status"]): string {
  switch (status) {
    case "approved": return "green";
    case "rejected": return "red";
    case "expired": return "yellow";
    case "orphaned": return "gray";
    default: return "white";
  }
}

function statusSymbol(status: ToolCall["status"]): string {
  switch (status) {
    case "approved": return "✓";
    case "rejected": return "✗";
    case "expired": return "⏱";
    case "orphaned": return "◌";
    default: return "?";
  }
}

export function ResolvedLog({ calls }: Props) {
  if (calls.length === 0) return null;

  return (
    <Box flexDirection="column" borderStyle="single" paddingX={1}>
      <Text dimColor bold>Recent decisions</Text>
      {calls.slice(0, 8).map((call) => (
        <Box key={call.callId} gap={1}>
          <Text color={statusColor(call.status)}>
            {statusSymbol(call.status)}
          </Text>
          <Text dimColor>{call.agentName}</Text>
          <Text dimColor>·</Text>
          <Text dimColor>{call.toolName}</Text>
        </Box>
      ))}
    </Box>
  );
}
