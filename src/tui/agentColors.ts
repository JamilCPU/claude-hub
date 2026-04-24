// Shared singleton so all components get the same color per agent name.
const COLORS = [
  "cyan",
  "magenta",
  "yellow",
  "green",
  "blue",
  "red",
  "white",
] as const;

export type AgentColor = (typeof COLORS)[number];

const colorMap = new Map<string, AgentColor>();
let index = 0;

export function getAgentColor(name: string): AgentColor {
  if (!colorMap.has(name)) {
    colorMap.set(name, COLORS[index % COLORS.length]!);
    index++;
  }
  return colorMap.get(name)!;
}
