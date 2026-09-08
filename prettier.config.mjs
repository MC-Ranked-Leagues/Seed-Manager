import * as tailwindcss from "prettier-plugin-tailwindcss";

/** @type {import("prettier").Config} */
export default {
  endOfLine: "lf",
  semi: true,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "es5",
  printWidth: 80,
  tailwindFunctions: ["cn", "cva"],
  plugins: [tailwindcss],
  tailwindStylesheet: "./web/src/index.css",
};
