import React from "react";
import { Box, Text } from "ink";
import { AgentInfo } from "../../types.js";
import { getAgentColor } from "../agentColors.js";

interface Props {
  agents: AgentInfo[];
  activeFilter: string | null; // null = show all
}

export function AgentSidebar({ agents, activeFilter }: Props) {
  if (agents.length === 0) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      paddingX={1}
      minWidth={20}
      maxWidth={24}
    >
      <Text bold dimColor>Agents</Text>
      {agents.map((agent) => {
        const color = getAgentColor(agent.name);
        const isFiltered = activeFilter === agent.name;
        return (
          <Box key={agent.name} gap={1}>
            <Text color={agent.active ? color : "gray"} bold={isFiltered}>
              {isFiltered ? "▶ " : "  "}
              {agent.name}
            </Text>
            {agent.pendingCount > 0 && (
              <Text color="yellow" bold>
                {agent.pendingCount}
              </Text>
            )}
            {!agent.active && <Text dimColor>idle</Text>}
          </Box>
        );
      })}
      <Box marginTop={1}>
        <Text dimColor>[tab] filter</Text>
      </Box>
    </Box>
  );
}
