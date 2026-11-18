import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 같은 와이파이의 휴대폰 등에서 개발 서버(npm run dev)를 IP 주소나 'OO.local' 주소로 열 수 있게 합니다.
  // 여기에 없는 주소로 열면 화면은 보여도 버튼이 동작하지 않아요.
  allowedDevOrigins: ["*.*.*.*", "*.local"],
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
