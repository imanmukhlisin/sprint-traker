import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "neon";
}

function Badge({ className, variant = "neon", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold font-space tracking-wide transition-colors",
        variant === "default" && "bg-primary text-white border border-primary/30",
        variant === "neon" && "bg-primary/10 text-primary border border-primary/30",
        variant === "secondary" && "bg-[#002112]/10 text-text-main border border-[#002112]/20",
        variant === "outline" && "border border-primary/40 text-primary",
        className
      )}
      {...props}
    />
  );
}

export { Badge };
