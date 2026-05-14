#!/usr/bin/env bash
# Usage: ./scripts/scaffold-plugin.sh <plugin-name>
# e.g.:  ./scripts/scaffold-plugin.sh keyboard
set -euo pipefail

NAME="${1:?Usage: $0 <plugin-name>}"
DIR="packages/plugin-${NAME}"

if [[ -d "$DIR" ]]; then
  echo "⚠  $DIR already exists, skipping scaffold."
  exit 0
fi

mkdir -p "${DIR}/src"

# package.json
cat > "${DIR}/package.json" <<PKG
{
  "name": "@f8team/reel-plugin-${NAME}",
  "version": "0.0.0",
  "description": "Reel plugin: ${NAME}",
  "license": "MIT",
  "type": "module",
  "sideEffects": false,
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./package.json": "./package.json"
  },
  "files": ["dist", "README.md"],
  "engines": { "node": ">=20" },
  "publishConfig": { "access": "public" },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --max-warnings=0",
    "size": "size-limit",
    "clean": "rm -rf dist coverage .turbo"
  },
  "keywords": ["video", "player", "f8", "plugin", "${NAME}"],
  "peerDependencies": { "@f8team/reel-core": "workspace:*" },
  "devDependencies": {
    "@f8team/reel-core": "workspace:*",
    "@size-limit/preset-small-lib": "^11.1.6",
    "@vitest/coverage-v8": "^2.1.2",
    "jsdom": "^25.0.1",
    "size-limit": "^11.1.6",
    "tsup": "^8.3.0"
  }
}
PKG

# tsconfig.json
cat > "${DIR}/tsconfig.json" <<TS
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": ".",
    "outDir": "dist",
    "noEmit": true,
    "types": ["vitest/globals", "node"]
  },
  "include": ["src/**/*", "vitest.config.ts", "tsup.config.ts"]
}
TS

# tsup.config.ts
cat > "${DIR}/tsup.config.ts" <<TSUP
import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  minify: false,
  target: "es2020",
  external: ["@f8team/reel-core"],
  outExtension: ({ format }) => ({ js: format === "esm" ? ".js" : ".cjs" }),
});
TSUP

# vitest.config.ts
cat > "${DIR}/vitest.config.ts" <<VIT
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/**/*.test.ts"],
      thresholds: { statements: 90, branches: 80, functions: 90, lines: 90 },
    },
  },
});
VIT

# .size-limit.json
cat > "${DIR}/.size-limit.json" <<SZ
[
  {
    "name": "@f8team/reel-plugin-${NAME} (gzip)",
    "path": "dist/index.js",
    "import": "*",
    "ignore": ["@f8team/reel-core"],
    "limit": "3 KB",
    "gzip": true
  }
]
SZ

# src/index.ts placeholder
cat > "${DIR}/src/index.ts" <<SRC
export { create${NAME^}Plugin } from "./${NAME}.js";
SRC

echo "✅ Scaffolded ${DIR}"
