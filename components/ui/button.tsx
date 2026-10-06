import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium font-space transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          size === "default" && "h-11 px-5 py-2 text-sm",
          size === "sm" && "h-9 rounded-lg px-3 text-xs",
          size === "lg" && "h-12 rounded-xl px-8 text-base font-semibold",
          size === "icon" && "h-10 w-10",
          variant === "default" &&
            "bg-primary text-white hover:bg-primary-hover hover:shadow-neon-hover active:shadow-neon-border",
          variant === "outline" &&
            "border border-primary/40 text-primary bg-white/70 hover:bg-primary/10 hover:shadow-neon-hover",
          variant === "secondary" &&
            "bg-[#002112] text-white hover:bg-[#00381f]",
          variant === "ghost" &&
            "hover:bg-primary/10 text-primary",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
