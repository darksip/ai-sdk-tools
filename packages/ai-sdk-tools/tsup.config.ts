import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/client.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    "@fondation-io/agents",
    "@fondation-io/artifacts",
    "@fondation-io/cache",
    "@fondation-io/devtools",
    "@fondation-io/memory",
    "@fondation-io/store",
    "ai",
    "@ai-sdk/react",
    "react",
    "react-dom",
    "zod",
    "zustand",
  ],
});
