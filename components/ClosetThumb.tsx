import { Link2 } from "lucide-react";
import type { ClosetItem } from "@/lib/data";
import { cn } from "./ui";

export function ClosetThumb({ item, className }: { item: ClosetItem; className?: string }) {
  return item.image ? (
    <img src={item.image} alt={item.name} className={cn("rounded-md object-cover", className)} />
  ) : (
    <span className={cn("flex items-center justify-center rounded-md bg-sand text-sub", className)}>
      <Link2 className="size-5" strokeWidth={1.4} />
    </span>
  );
}
