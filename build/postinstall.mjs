import { execSync } from "child_process";

// const isCI =
//   process.env.CI === "true" ||
//   process.env.GITHUB_ACTIONS === "true" ||
//   process.env.RUNNER_OS === "Windows";

// if (isCI) {
//   console.log("Skipping patch-package in CI environment");
// } else {
//   execSync("npx patch-package", { stdio: "inherit" });
// }
execSync("npx patch-package", { stdio: "inherit" });