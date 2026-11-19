"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TabBar } from "@/components/TabBar";
import { savedOnboarded } from "@/lib/store";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // 처음 온 사용자가 채팅·옷장 같은 탭 주소로 바로 들어와도, 첫 화면(시작 → 온보딩)부터 보여줘요.
  const [ok, setOk] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 기록은 브라우저에서만 읽을 수 있어요
    if (savedOnboarded()) setOk(true);
    else router.replace("/");
  }, [router]);
  if (!ok) return null;
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <TabBar />
    </>
  );
}
