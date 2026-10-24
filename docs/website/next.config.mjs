import { createMDX } from "fumadocs-mdx/next";

const repoBase = "/mingzhan";

const isGitHubPages = process.env.MINGZHAN_DOCS_GITHUB_PAGES === "true";

/** @type {import('next').NextConfig} */
const config = {
  assetPrefix: isGitHubPages
    ? "https://ahmadrosid.github.io/mingzhan"
    : undefined,
  basePath: repoBase,
  env: {
    NEXT_PUBLIC_BASE_PATH: repoBase,
  },
  images: { unoptimized: true },
  output: "export",
  reactStrictMode: true,
  trailingSlash: false,
  turbopack: {
    root: import.meta.dirname,
  },
};

export default createMDX()(config);
