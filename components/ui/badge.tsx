import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-[#1B9AAA]/10 text-[#1B9AAA] border border-[#1B9AAA]/20",
        secondary: "bg-secondary/10 text-secondary border border-secondary/20",
        success: "bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400",
        warning: "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
        destructive: "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400",
        outline: "border border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
