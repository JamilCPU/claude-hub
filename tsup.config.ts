import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { server: "src/server/index.ts" },
    format: ["esm"],
    target: "node18",
    outDir: "dist",
    clean: false,
  },
  {
    entry: { tui: "src/tui/index.tsx" },
    format: ["esm"],
    target: "node18",
    outDir: "dist",
    jsx: "react-jsx",
    clean: false,
  },
  {
    entry: { "hook-bridge": "src/hook-bridge.ts" },
    format: ["esm"],
    target: "node18",
    outDir: "dist",
    clean: false,
  },
  {
    entry: { install: "src/install.ts" },
    format: ["esm"],
    target: "node18",
    outDir: "dist",
    clean: false,
  },
  {
    entry: { cli: "src/cli.ts" },
    format: ["esm"],
    target: "node18",
    outDir: "dist",
    jsx: "react-jsx",
    clean: true,
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
