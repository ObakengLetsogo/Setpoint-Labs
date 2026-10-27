import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["engine/**/*.test.ts", "rigs/**/*.test.ts", "data/**/*.test.ts"] },
});
