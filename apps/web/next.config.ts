import type { NextConfig } from "next";

const config: NextConfig = {
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  transpilePackages: [
    "@comprausa/api-client",
    "@comprausa/design-tokens",
    "@comprausa/types",
    "@comprausa/ui",
    "@comprausa/utils",
    "@comprausa/validation",
  ],
};

export default config;
