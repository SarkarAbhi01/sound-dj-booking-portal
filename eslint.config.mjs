import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";

export default [
  {
    ignores: [
      "node_modules/**",
      "Test/node_modules/**",
      "frontend/node_modules/**",
      "backend/node_modules/**",
      "frontend/build/**",
      "frontend/dist/**",
      "backend/dist/**",
      "coverage/**",
    ],
  },

  js.configs.recommended,

  // FRONTEND
  {
    files: ["frontend/src/**/*.{js,jsx}"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",

      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },

      globals: {
        ...globals.browser,
      },
    },

    plugins: {
      react,
    },

    settings: {
      react: {
        version: "detect",
      },
    },

    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
      "react/jsx-uses-vars": "error",
      "react/react-in-jsx-scope": "off",
    },
  },

  // BACKEND
  {
    files: ["backend/**/*.{js,mjs,cjs}"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",

      globals: {
        ...globals.node,
      },
    },

    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
    },
  },
];