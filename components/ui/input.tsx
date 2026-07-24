import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex min-h-12 w-full rounded-xl border border-brand-olive/20 bg-white px-4 py-3 text-sm text-brand-forest outline-none transition placeholder:text-brand-olive/55 focus:border-brand-olive focus:ring-4 focus:ring-brand-sage/20 disabled:cursor-not-allowed disabled:bg-brand-cream",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };

