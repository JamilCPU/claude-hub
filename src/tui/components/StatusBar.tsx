import React from "react";
import { Box, Text } from "ink";

interface Props {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  connected: boolean;
}

export function StatusBar({
  pendingCount,
  approvedCount,
  rejectedCount,
  connected,
}: Props) {
  return (
    <Box borderStyle="single" paddingX={1} justifyContent="space-between">
      <Box gap={3}>
        <Text>
          <Text color="yellow" bold>
            Pending:{" "}
          </Text>
          <Text bold>{pendingCount}</Text>
        </Text>
        <Text>
          <Text color="green">Approved: </Text>
          <Text>{approvedCount}</Text>
        </Text>
        <Text>
          <Text color="red">Rejected: </Text>
          <Text>{rejectedCount}</Text>
        </Text>
      </Box>
      <Text color={connected ? "green" : "red"}>
        {connected ? "● connected" : "○ disconnected"}
      </Text>
    </Box>
  );
}
