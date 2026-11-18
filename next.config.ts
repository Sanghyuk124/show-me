import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 같은 와이파이의 휴대폰에서 개발 서버(npm run dev)를 열 수 있게 합니다.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
