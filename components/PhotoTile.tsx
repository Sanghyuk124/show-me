"use client";

import { Check } from "lucide-react";
import { cn } from "./ui";

export function PhotoTile({ src, on, onClick, label, aspect }: { src: string; on: boolean; onClick: () => void; label: string; aspect: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      style={{ aspectRatio: aspect }}
      className={cn("relative overflow-hidden", on && "outline-2 -outline-offset-2 outline-plum")}
    >
      <img src={src} alt="" className="h-full w-full object-cover" />
      {on && (
        <span className="absolute top-1 right-1 flex size-[18px] items-center justify-center rounded-full bg-plum text-white">
          <Check className="size-3" strokeWidth={2.4} />
        </span>
      )}
    </button>
  );
}
