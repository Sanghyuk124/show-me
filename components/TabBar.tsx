"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, MessageCircle, Star } from "lucide-react";
import { ClosetIcon, PersonIcon } from "./icons";
import { cn } from "./ui";

const TABS = [
  { href: "/chat", label: "채팅", Icon: MessageCircle },
  { href: "/closet", label: "옷장", Icon: ClosetIcon },
  { href: "/avatar", label: "아바타", Icon: PersonIcon },
  { href: "/taste", label: "취향 찾기", Icon: Star },
  { href: "/calendar", label: "캘린더", Icon: CalendarDays },
];

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="pb-tab grid shrink-0 grid-cols-5 border-t border-line bg-cream px-3 pt-3">
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("flex flex-col items-center gap-1 text-[10px]", active ? "font-bold text-plum" : "text-faint")}
          >
            <Icon className="size-[21px]" strokeWidth={active ? 1.9 : 1.5} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
