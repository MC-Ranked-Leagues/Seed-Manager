import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          clearMocks: true,
          restoreMocks: true,
          name: "convex",
          include: ["convex/**/*.test.{ts,js}"],
          environment: "edge-runtime",
        },
      },
      {
        extends: true,
        test: {
          clearMocks: true,
          restoreMocks: true,
          name: "frontend",
          include: ["web/src/**/*.test.{ts,tsx,js,jsx}"],
          exclude: [...configDefaults.exclude, "convex/**"],
          environment: "node",
        },
      },
    ],
  },
});
