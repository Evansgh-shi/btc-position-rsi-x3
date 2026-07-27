import { existsSync, renameSync, rmSync } from "node:fs";

if (!existsSync("out")) {
  throw new Error("Next.js static export folder 'out' was not created.");
}

if (existsSync("dist")) {
  rmSync("dist", { recursive: true, force: true });
}

renameSync("out", "dist");
