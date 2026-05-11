import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import prettierConfig from "eslint-config-prettier";

const tsRecommendedRules = tsPlugin.configs?.recommended?.rules ?? {};

export default [
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.turbo/**",
      "**/node_modules/**",
      "**/storybook-static/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        // Runtime
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        queueMicrotask: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        // DOM types (TypeScript validates these via lib.dom; ESLint's
        // no-undef can't read TS types so we whitelist explicitly).
        Element: "readonly",
        HTMLElement: "readonly",
        HTMLDivElement: "readonly",
        HTMLButtonElement: "readonly",
        HTMLVideoElement: "readonly",
        HTMLMediaElement: "readonly",
        HTMLScriptElement: "readonly",
        HTMLAnchorElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLLabelElement: "readonly",
        HTMLImageElement: "readonly",
        HTMLTrackElement: "readonly",
        XMLHttpRequest: "readonly",
        Event: "readonly",
        KeyboardEvent: "readonly",
        MouseEvent: "readonly",
        CustomEvent: "readonly",
        TimeRanges: "readonly",
        MediaError: "readonly",
        CSSStyleDeclaration: "readonly",
        Promise: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
    },
    rules: {
      ...tsRecommendedRules,
      // TS already flags undefined identifiers; disable ESLint's no-undef
      // because it can't see ambient types from lib.dom.
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "**/__tests__/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  prettierConfig,
];
