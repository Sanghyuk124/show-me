"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui";

// Figma 하단 내비게이션. 아이콘은 Figma에서 내려받은 원본 SVG입니다 (켜짐: 자주색, 꺼짐: 회색).
const TABS = [
  { href: "/chat", label: "채팅", icon: "chat" },
  { href: "/closet", label: "옷장", icon: "closet" },
  { href: "/avatar", label: "아바타", icon: "avatar" },
  { href: "/taste", label: "취향 찾기", icon: "taste" },
  { href: "/calendar", label: "캘린더", icon: "calendar" },
];

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="pb-safe flex shrink-0 gap-1 border-t border-line bg-cream px-3 pt-3.5">
      {TABS.map(({ href, label, icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("flex flex-1 flex-col items-center gap-[5px] text-[10px] leading-[1.5]", active ? "font-bold text-plum" : "text-sub")}
          >
            <img src={`/icons/tab-${icon}-${active ? "on" : "off"}.svg`} alt="" width={21} height={21} className="block size-[21px]" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
