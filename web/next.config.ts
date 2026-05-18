import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output: empaqueta sólo lo necesario para correr en producción
  // (server + dependencias mínimas) bajo `.next/standalone`. Lo usa el Dockerfile.
  output: "standalone",
};

export default nextConfig;
