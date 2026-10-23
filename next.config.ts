import type { NextConfig } from "next";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const isUserOrOrgSite = repoName.endsWith(".github.io");

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  ...(isGitHubPages && repoName && !isUserOrOrgSite ? { basePath: `/${repoName}` } : {}),
};

export default nextConfig;
