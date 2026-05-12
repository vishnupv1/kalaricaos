import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: rootDir,
  /** Hide the floating Next.js dev indicator in the corner. */
  devIndicators: false,
};

export default nextConfig;
