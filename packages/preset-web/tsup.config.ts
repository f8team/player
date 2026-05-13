import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  target: "es2020",
  external: [
    "@f8/player-core",
    "@f8/player-plugin-auth-aware",
    "@f8/player-plugin-fullscreen",
    "@f8/player-plugin-hls-quality",
    "@f8/player-plugin-keyboard",
    "@f8/player-plugin-markers",
    "@f8/player-plugin-pip",
    "@f8/player-plugin-subtitles",
    "@f8/player-plugin-thumbnails",
  ],
  outExtension: ({ format }) => ({ js: format === "esm" ? ".js" : ".cjs" }),
});
