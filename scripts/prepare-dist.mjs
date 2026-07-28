import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative, sep } from "node:path";

if (!existsSync("out")) {
  throw new Error("Next.js static export folder 'out' was not created.");
}

if (existsSync("dist")) {
  rmSync("dist", { recursive: true, force: true });
}

renameSync("out", "dist");

mkdirSync("dist/server", { recursive: true });
mkdirSync("dist/.openai", { recursive: true });
copyFileSync(".openai/hosting.json", "dist/.openai/hosting.json");

function collectFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (path === join("dist", "server") || path === join("dist", ".openai")) return [];
    return statSync(path).isDirectory() ? collectFiles(path) : [path];
  });
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

const assets = Object.fromEntries(
  collectFiles("dist").map((file) => {
    const urlPath = `/${relative("dist", file).split(sep).join("/")}`;
    const extension = urlPath.slice(urlPath.lastIndexOf("."));
    return [
      urlPath,
      {
        body: readFileSync(file).toString("base64"),
        type: mimeTypes[extension] ?? "application/octet-stream",
      },
    ];
  }),
);

writeFileSync(
  "dist/server/index.js",
  `const ASSETS = ${JSON.stringify(assets)};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname === "/" ? "/index.html" : url.pathname;
    const asset = ASSETS[path];
    if (!asset) return new Response("Not Found", { status: 404 });
    const body = Uint8Array.from(atob(asset.body), (character) => character.charCodeAt(0));
    const immutable = path.startsWith("/_next/static/");
    return new Response(body, {
      headers: {
        "Content-Type": asset.type,
        "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "public, max-age=300",
      },
    });
  },
};
`,
);
