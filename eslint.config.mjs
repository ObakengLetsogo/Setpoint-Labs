import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Lesson content is paid content. Only the server may import it; the browser fetches it from
    // /api/lessons after an access check.
    files: ["app/**", "components/**", "store/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/data/lessons", "@/data/lessons/*", "@/data/teach", "@/data/teach-*", "@/data/quizzes", "@/data/quizzes/*"], allowTypeImports: true, message: "Lesson content is server only. Use the catalogue and bundleOf()." },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
