import type { Metadata, Viewport } from "next";
import "@fontsource/noto-sans-kr/400.css";
import "@fontsource/noto-sans-kr/500.css";
import "@fontsource/noto-sans-kr/700.css";
import "@fontsource/lora/400.css";
import "./globals.css";
import { Toast } from "@/components/ui";

export const metadata: Metadata = {
  title: "Show Me — 당신의 쇼핑 메이트",
  description: "뭘 입을지 막막한 순간부터 나답게 고를 수 있는 순간까지.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#faf8f4",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full">
      <body className="h-full">
        {/* 휴대폰에서는 화면 전체, PC에서는 가운데 모바일 폭으로 보입니다 */}
        <div
          id="app-shell"
          className="relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-cream"
        >
          {children}
          <Toast />
        </div>
      </body>
    </html>
  );
}
