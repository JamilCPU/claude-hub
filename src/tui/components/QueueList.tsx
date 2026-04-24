import React from "react";
import { Box, Text } from "ink";
import { ToolCall } from "../../types.js";
import { getAgentColor } from "../agentColors.js";

function elapsed(timestamp: number): string {
  const secs = Math.floor((Date.now() - timestamp) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m${secs % 60}s`;
}

function remaining(expiresAt: number, now: number): { text: string; urgent: boolean } {
  const secs = Math.max(0, Math.floor((expiresAt - now) / 1000));
  const urgent = secs < 30;
  if (secs < 60) return { text: `${secs}s`, urgent };
  return { text: `${Math.floor(secs / 60)}m${secs % 60}s`, urgent };
}

interface Props {
  calls: ToolCall[];
  selectedIndex: number;
  now: number; // passed from App's clock so all rows update together
}

export function QueueList({ calls, selectedIndex, now }: Props) {
  if (calls.length === 0) {
    return (
      <Box flexGrow={1} alignItems="center" justifyContent="center">
        <Text dimColor>No pending tool calls. Waiting for agents...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      {calls.map((call, idx) => {
        const isSelected = idx === selectedIndex;
        const color = getAgentColor(call.agentName);
        const timer = remaining(call.expiresAt, now);

        return (
          <Box
            key={call.callId}
            paddingX={1}
            backgroundColor={isSelected ? "blue" : undefined}
          >
            <Text color={isSelected ? "white" : "gray"}>
              {isSelected ? "▶ " : "  "}
            </Text>
            <Text color={color} bold>
              [{call.agentName}]
            </Text>
            <Text> </Text>
            <Text color={isSelected ? "white" : undefined} bold={isSelected}>
              {call.toolName}
            </Text>
            <Text dimColor> · {elapsed(call.timestamp)} ago</Text>
            <Text> </Text>
            <Text color={timer.urgent ? "red" : "gray"}>
              ⏱{timer.text}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
