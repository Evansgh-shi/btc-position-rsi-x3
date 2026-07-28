/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

const nextConfig = {
  poweredByHeader: false,
  output: "export",
  basePath: isGitHubPages ? "/btc-position-rsi-x3" : "",
};

export default nextConfig;
