import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Run tests in Pacific time: it's west of UTC, which exposes "off by one day" date bugs.
process.env.TZ = "America/Los_Angeles";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: { TZ: "America/Los_Angeles" },
  },
});
