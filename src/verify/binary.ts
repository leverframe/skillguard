import { execSync } from "node:child_process";

export function findMinisignBinary(): string | null {
  if (process.env.SKILLGUARD_NO_MINISIGN === "1") return null;
  try {
    const path = execSync("command -v minisign || where minisign 2>NUL", {
      encoding: "utf-8",
    }).trim();
    return path.split("\n")[0].trim() || null;
  } catch {
    return null;
  }
}
