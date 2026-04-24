import React from "react";
import { Box, Text } from "ink";
import { ToolCall } from "../../types.js";

interface Props {
  call: ToolCall | undefined;
}

function formatInput(input: Record<string, unknown>): string {
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
}

export function ToolCallDetail({ call }: Props) {
  if (!call) {
    return (
      <Box
        borderStyle="single"
        flexDirection="column"
        padding={1}
        flexGrow={1}
        minWidth={40}
      >
        <Text dimColor>Select a call to see details</Text>
      </Box>
    );
  }

  const inputStr = formatInput(call.toolInput);
  const lines = inputStr.split("\n").slice(0, 30); // cap at 30 lines

  return (
    <Box
      borderStyle="single"
      flexDirection="column"
      padding={1}
      flexGrow={1}
      minWidth={40}
    >
      <Box marginBottom={1} flexDirection="column" gap={0}>
        <Text bold>Tool: <Text color="cyan">{call.toolName}</Text></Text>
        <Text bold>Agent: <Text color="magenta">{call.agentName}</Text></Text>
        <Text bold>Session: <Text dimColor>{call.sessionId.slice(0, 16)}...</Text></Text>
      </Box>

      <Text bold underline>Input:</Text>
      <Box flexDirection="column" marginTop={0}>
        {lines.map((line, i) => (
          <Text key={i} dimColor={i > 0}>
            {line}
          </Text>
        ))}
        {inputStr.split("\n").length > 30 && (
          <Text dimColor>... (truncated)</Text>
        )}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>─────────────────────────</Text>
        <Text color="green">[a] Approve</Text>
        <Text color="red">[r] Reject</Text>
        <Text color="yellow">[↑↓] Navigate</Text>
      </Box>
    </Box>
  );
}
