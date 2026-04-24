import React from "react";
import { Box, Text, useInput } from "ink";

interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BulkConfirm({ message, onConfirm, onCancel }: Props) {
  useInput((input, key) => {
    if (input === "y" || input === "Y") onConfirm();
    if (input === "n" || input === "N" || key.escape) onCancel();
  });

  return (
    <Box
      borderStyle="round"
      borderColor="yellow"
      paddingX={2}
      paddingY={1}
      flexDirection="column"
      alignItems="center"
    >
      <Text bold color="yellow">
        Bulk Action
      </Text>
      <Text>{message}</Text>
      <Box marginTop={1} gap={3}>
        <Text color="green">[y] Confirm</Text>
        <Text color="red">[n / Esc] Cancel</Text>
      </Box>
    </Box>
  );
}
