import { existsSync, renameSync, rmSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
const output = resolve("dist");
if (!existsSync("out/index.html")) throw new Error("Next.js did not export out/index.html");
if (existsSync(output)) rmSync(output, { recursive: true, force: true });
renameSync("out", output);
writeFileSync(join(output, ".nojekyll"), "");
const prefix = process.env.DEPLOY_TARGET === "github" ? "/btc-position-rsi-x3" : "";
function verify(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) verify(file);
    else if (file.endsWith(".html")) {
      const html = readFileSync(file, "utf8");
      for (const match of html.matchAll(/(?:src|href)="([^"?#]+)[^"]*"/g)) {
        if (!match[1].includes("/_next/")) continue;
        const path = match[1].slice(prefix.length);
        if (!path.startsWith("/_next/") || !existsSync(join(output, path.slice(1)))) throw new Error(`Missing referenced asset: ${match[1]}`);
      }
    }
  }
}
verify(output);
if (readFileSync(join(output, "index.html"), "utf8").includes("正在计算今日仓位")) throw new Error("Refusing to publish an indefinite loading screen");
if (process.env.DEPLOY_TARGET !== "github") {
  const { mkdirSync, copyFileSync } = await import("node:fs");
  const assets = {};
  function embed(directory) {
    for (const entry of readdirSync(directory, { withFileTypes:true })) {
      const file=join(directory,entry.name);
      if (entry.isDirectory()) embed(file);
      else {
        const url = "/" + file.slice(output.length + 1).replaceAll("\\", "/");
        const extension = url.slice(url.lastIndexOf("."));
        const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".txt":"text/plain; charset=utf-8"};
        assets[url]={body:readFileSync(file).toString("base64"),type:types[extension]||"application/octet-stream"};
      }
    }
  }
  embed(output);
  const model=readFileSync("lib/market-model.mjs","utf8").replaceAll("export function", "function");
  const collector=readFileSync("lib/collect-market.mjs","utf8").replace(/^import .*;\r?\n/gm, "").replaceAll("export async function", "async function");
  mkdirSync(join(output,"server"),{recursive:true});
  mkdirSync(join(output,".openai"),{recursive:true});
  copyFileSync(".openai/hosting.json",join(output,".openai/hosting.json"));
  writeFileSync(join(output,"server/index.js"),`${model}\n${collector}\nconst ASSETS=${JSON.stringify(assets)};\n${readFileSync("worker/index.mjs","utf8")}`);
}
console.log("Static export verified: real initial data and all referenced CSS/JS files are present.");
