import type { NextConfig } from "next";

const config: NextConfig = {
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
