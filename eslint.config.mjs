import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    ignores: ["demo-vulnerable-repo/**"]
  }
];

export default eslintConfig;
