import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { ToolCall } from "../../types.js";

interface Props {
  call: ToolCall | undefined;
  editMode: boolean;
  editValue: string;
  onEditChange: (val: string) => void;
  onEditSubmit: () => void;
}

function formatInput(input: Record<string, unknown>): string {
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
}

/** Extract the primary "command" field for Bash-style tools to enable editing. */
function getEditableField(call: ToolCall): { key: string; value: string } | null {
  const input = call.toolInput;
  for (const key of ["command", "cmd", "script", "query", "content"]) {
    if (typeof input[key] === "string") {
      return { key, value: input[key] as string };
    }
  }
  return null;
}

export function ToolCallDetail({
  call,
  editMode,
  editValue,
  onEditChange,
  onEditSubmit,
}: Props) {
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
  const lines = inputStr.split("\n").slice(0, 25);
  const editable = getEditableField(call);

  return (
    <Box
      borderStyle="single"
      flexDirection="column"
      padding={1}
      flexGrow={1}
      minWidth={40}
    >
      <Box marginBottom={1} flexDirection="column">
        <Text bold>
          Tool: <Text color="cyan">{call.toolName}</Text>
        </Text>
        <Text bold>
          Agent: <Text color="magenta">{call.agentName}</Text>
        </Text>
        <Text bold>
          Session: <Text dimColor>{call.sessionId.slice(0, 16)}...</Text>
        </Text>
      </Box>

      <Text bold underline>
        Input:
      </Text>

      {editMode && editable ? (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Editing [{editable.key}] — Enter to approve with change:</Text>
          <Box marginTop={1}>
            <Text color="yellow">$ </Text>
            <TextInput
              value={editValue}
              onChange={onEditChange}
              onSubmit={onEditSubmit}
            />
          </Box>
          <Box marginTop={1}>
            <Text dimColor>[Enter] approve with edit  [Esc] cancel edit</Text>
          </Box>
        </Box>
      ) : (
        <Box flexDirection="column" marginTop={0}>
          {lines.map((line, i) => (
            <Text key={i} dimColor={i > 0}>
              {line}
            </Text>
          ))}
          {inputStr.split("\n").length > 25 && (
            <Text dimColor>... (truncated)</Text>
          )}
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>─────────────────────────</Text>
        <Text color="green">[a] Approve</Text>
        <Text color="red">[r] Reject</Text>
        {editable && !editMode && (
          <Text color="yellow">[e] Edit &amp; approve</Text>
        )}
        <Text color="cyan">[A] Approve all (agent)</Text>
        <Text color="magenta">[ctrl+a] Approve all</Text>
      </Box>
    </Box>
  );
}
