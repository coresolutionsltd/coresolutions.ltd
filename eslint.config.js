import tsParser from "@typescript-eslint/parser";
import functional from "eslint-plugin-functional";
import eslintPluginAstro from "eslint-plugin-astro";

export default [
  ...eslintPluginAstro.configs.recommended,
  {
    files: ["**/*.js", "**/*.ts", "**/*.tsx, *.astro"],
    ignores: [".astro/**", "node_modules", "dist"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        extraFileExtensions: [".astro"],
      },
      ecmaVersion: "latest", // Use the latest ECMAScript standard
      sourceType: "module", // Enable ESM
    },
    plugins: {
      functional,
    },
    rules: {},
  },
];
