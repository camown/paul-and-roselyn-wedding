import { spawn } from "node:child_process";
const child = spawn(
  process.execPath,
  ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    windowsHide: true,
    env: {
      ...process.env,
      ...(process.platform === "win32" && !process.env.PLAYWRIGHT_BROWSERS_PATH
        ? { PLAYWRIGHT_BROWSERS_PATH: "D:/wedding-browser-cache" }
        : {}),
    },
  },
);
child.on("exit", (code) => (process.exitCode = code ?? 1));
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
