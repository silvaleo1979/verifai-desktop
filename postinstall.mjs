import { execSync } from "child_process";

// Se estiver rodando no GitHub Actions (CI), não aplica patch
if (!process.env.CI) {
  execSync("npx patch-package", { stdio: "inherit" });
} else {
  console.log("Skipping patch-package on CI");
}