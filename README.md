# claude-hub

Centralized tool call operator for multi-agent Claude Code orchestration.

When you're running multiple Claude Code agents simultaneously, each one opens its own approval prompt in its own terminal. **claude-hub** routes every tool call to a single TUI console so you can approve or reject them all from one place.

```
Claude Agent #1 ──┐
Claude Agent #2 ──┼──▶ hook-bridge ──▶ Hub Server ──▶ TUI Console (you)
Claude Agent #3 ──┘
```

## Quick Start

### 1. Install dependencies and build

```bash
git clone https://github.com/JamilCPU/claude-hub.git
cd claude-hub
npm install
npm run build
```

### 2. Start the hub server (dedicated terminal)

```bash
node dist/server.js
# or after linking: claude-hub server
```

### 3. Start the TUI console (another dedicated terminal)

```bash
node dist/tui.js
# or after linking: claude-hub tui
```

### 4. Install the PreToolUse hook (once)

```bash
node dist/install.js
# or after linking: claude-hub install
```

This adds a hook to `~/.claude/settings.json` that intercepts every tool call and forwards it to the hub.

### 5. Launch your Claude Code agents

Open as many terminals as you want and run `claude` normally. Every tool call will appear in the TUI for your approval.

**Optional:** Set a custom name per agent terminal:
```bash
AGENT_NAME=backend claude
AGENT_NAME=frontend claude
```

## TUI Controls

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate queue |
| `a` | Approve selected call |
| `r` | Reject selected call |
| `q` | Quit TUI |

## How It Works

Claude Code supports [PreToolUse hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) — shell commands that run before every tool execution. The hook can return a JSON decision:

```json
{ "permissionDecision": "allow" }   // approve
{ "permissionDecision": "deny", "reason": "..." }  // reject
{ "permissionDecision": "ask" }     // fall back to normal prompt
```

claude-hub's `hook-bridge` script intercepts the call, POSTs it to the local hub server, and **blocks** until you decide in the TUI. The hub holds the HTTP response open (long-poll) and resolves it when you press `a` or `r`.

**Fail-open:** If the hub server is not running, every tool call falls back to `ask` — normal Claude Code behavior. Your agents are never blocked.

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `HUB_PORT` | `7900` | Hub server port |
| `HUB_TIMEOUT_MS` | `300000` | Auto-expire pending calls (5 min) |
| `AGENT_NAME` | auto | Override agent display name |

## Uninstall

Remove the hook entry from `~/.claude/settings.json`:

```json
"hooks": {
  "PreToolUse": [
    // remove the entry with "hook-bridge" in the command
  ]
}
```

## Roadmap

- [x] Phase 1: Core hub — single terminal, approve/reject queue
- [ ] Phase 2: Multi-agent coloring, bulk approve/reject
- [ ] Phase 3: Timeout config, crash recovery, input editing
- [ ] Phase 4: Auto-approve rules, audit log, mobile push notifications

## License

MIT
