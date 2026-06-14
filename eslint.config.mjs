import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    ignores: ["demo-vulnerable-repo/**", "dist/**", "build/**", "coverage/**"]
  }
];

export default eslintConfig;
