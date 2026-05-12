import mdx from "@mdx-js/rollup";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    // MDX must come before the React plugin.
    { enforce: "pre", ...mdx({ providerImportSource: "@mdx-js/react" }) },
    react(),
  ],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
