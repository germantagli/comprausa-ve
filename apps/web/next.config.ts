import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@comprausa/api-client", "@comprausa/design-tokens", "@comprausa/ui", "@comprausa/validation"],
};

export default config;
