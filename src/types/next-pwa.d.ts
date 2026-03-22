declare module "next-pwa" {
  import { NextConfig } from "next";
  type PWAConfig = {
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    runtimeCaching?: unknown[];
    [key: string]: unknown;
  };
  function withOffline(config: PWAConfig): (nextConfig: NextConfig) => NextConfig;
  export default withOffline;
}
