import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(async () => {
  const { default: mdx } = await import("@mdx-js/rollup");

  return {
    plugins: [
      // MDX must come before the React plugin.
      { enforce: "pre", ...mdx({ include: "**/*.mdx", providerImportSource: "@mdx-js/react" }) },
      react(),
    ],
    resolve: {
      alias: {
        "@": new URL("./src", import.meta.url).pathname,
      },
    },
  };
});
