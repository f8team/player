import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "internal/index": "src/internal/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  minify: false,
  target: "es2020",
  outExtension: ({ format }) => ({ js: format === "esm" ? ".js" : ".cjs" }),
});
