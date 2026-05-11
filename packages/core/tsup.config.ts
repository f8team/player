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
  // hls.js is a peer dep: consumers (f8-dash-ui, f8-ui, etc.) install it
  // themselves. Marking it external ensures bundlers (webpack/Vite/esbuild)
  // see `import("hls.js")` in their own build pass and emit a proper lazy
  // chunk — required for webpack/CRA where bare specifiers only resolve if
  // the bundler itself processes the import() at compile time.
  external: ["hls.js"],
  outExtension: ({ format }) => ({ js: format === "esm" ? ".js" : ".cjs" }),
});
