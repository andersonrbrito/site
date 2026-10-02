import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node", include: ["tests/**/*.test.{js,ts}"], testTimeout: 60000, hookTimeout: 120000 } });
