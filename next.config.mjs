/** @type {import('next').NextConfig} */
const basePath = process.env.DEPLOY_TARGET === "github" ? "/btc-position-rsi-x3" : "";

const nextConfig = {
  poweredByHeader: false,
  output: "export",
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
