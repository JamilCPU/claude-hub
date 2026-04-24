import React from "react";
import { Box, Text } from "ink";
import { ToolCall } from "../../types.js";

const AGENT_COLORS = [
  "cyan",
  "magenta",
  "yellow",
  "blue",
  "green",
  "red",
  "white",
] as const;

const agentColorMap = new Map<string, (typeof AGENT_COLORS)[number]>();
let colorIndex = 0;

function getAgentColor(
  agentName: string
): (typeof AGENT_COLORS)[number] {
  if (!agentColorMap.has(agentName)) {
    agentColorMap.set(agentName, AGENT_COLORS[colorIndex % AGENT_COLORS.length]!);
    colorIndex++;
  }
  return agentColorMap.get(agentName)!;
}

function elapsed(timestamp: number): string {
  const secs = Math.floor((Date.now() - timestamp) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m${secs % 60}s`;
}

interface Props {
  calls: ToolCall[];
  selectedIndex: number;
}

export function QueueList({ calls, selectedIndex }: Props) {
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
          </Box>
        );
      })}
    </Box>
  );
}
