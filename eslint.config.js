const { defineConfig } = require("eslint/config");
const typescriptPlugin = require("@typescript-eslint/eslint-plugin");
const typescriptParser = require("@typescript-eslint/parser");

module.exports = defineConfig([
  {
    ignores: [
      "build/**",
      "plugin/build/**",
      "example/**",
      "node_modules/**",
    ],
  },
  {
    files: ["src/**/*.ts", "plugin/src/**/*.ts"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptPlugin,
    },
    rules: {
      ...typescriptPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);
