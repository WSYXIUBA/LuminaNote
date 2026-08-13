import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // React 19 新规则：对「从 localStorage 初始化 state」这类常见模式误报，
      // 全面改造 25+ 文件回归风险高，降为警告保留可见性，后续可逐步精修。
      "react-hooks/set-state-in-effect": "warn",
      // latest-ref 同步赋值（ref.current = props 值）是官方推荐模式，降为警告。
      "react-hooks/refs": "warn",
      // 历史遗留的 any 类型，降为警告，后续逐个替换为具体类型。
      "@typescript-eslint/no-explicit-any": "warn",
      // React Compiler 新规则：对 useMemo 随机初始化、effect 引用后置函数等
      // 常见模式误报（运行时均正常），降为警告保留可见性。
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/immutability": "warn",
    },
  },
]);

export default eslintConfig;
