import { Link2 } from "lucide-react";
import type { ClosetItem } from "@/lib/data";
import { cn } from "./ui";

export function ClosetThumb({ item, className }: { item: ClosetItem; className?: string }) {
  return item.image ? (
    // 배경을 지운 사진은 잘리지 않게 칸 안에 맞춰 보여 줘요
    <img
      src={item.image}
      alt={item.name}
      className={cn("rounded-md", item.cutout ? "bg-[#f4f0eb] object-contain p-1" : "object-cover", className)}
    />
  ) : (
    <span className={cn("flex items-center justify-center rounded-md bg-sand text-sub", className)}>
      <Link2 className="size-5" strokeWidth={1.4} />
    </span>
  );
}
