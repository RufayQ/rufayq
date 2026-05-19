import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "prefer-const": "warn",
    },
  },
  {
    // Canonical overlay guard — no raw `fixed inset-0` modals or `createPortal`
    // calls outside the shared overlay primitive. All overlays must go
    // through `src/shared/ui/overlay/OverlayLayer`.
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/shared/ui/overlay/**",
      "src/**/__tests__/**",
      "src/**/*.test.{ts,tsx}",
      "src/test/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "CallExpression[callee.name='createPortal']",
          message:
            "Do not call createPortal directly. Use <OverlayLayer> from '@/shared/ui/overlay' to keep portal mounting, z-index, focus trap, and back-button behavior consistent.",
        },
        {
          selector: "ImportSpecifier[imported.name='createPortal']",
          message:
            "Do not import createPortal. Use <OverlayLayer> from '@/shared/ui/overlay'.",
        },
        {
          selector: "Literal[value=/(^|\\s)fixed inset-0(\\s|$)/]",
          message:
            "Raw `fixed inset-0` overlay markup is forbidden outside src/shared/ui/overlay. Use <OverlayLayer> from '@/shared/ui/overlay'.",
        },
      ],
    },
  },
);
