import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import React from "react";

const interestBadgeVariants = cva("inline-flex items-center font-medium", {
  variants: {
    variant: {
      default: "bg-blue-50 text-blue-700 border border-blue-200",
      shared: "bg-green-50 text-green-700 ring-1 ring-green-200",
      related: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
      muted: "bg-gray-100 text-gray-800",
      red: "bg-red-50 text-red-700 border border-red-200",
    },
    size: {
      sm: "gap-1 rounded-full px-2.5 py-0.5 text-xs",
      md: "gap-1.5 rounded-full px-3 py-1.5 text-base",
      lg: "flex-col rounded-xl px-3 py-1.5 text-base",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "sm",
  },
});

interface InterestBadgeProps extends VariantProps<typeof interestBadgeVariants> {
  name: string;
  icon?: string | React.ReactNode;
  description?: string;
  className?: string;
}

export function InterestBadge({ name, icon, description, variant, size, className }: InterestBadgeProps) {
  return (
    <span className={cn(interestBadgeVariants({ variant, size }), className)}>
      {size === "lg" ? (
        <>
          <span className="font-medium">{name}</span>
          {description && <span className="text-gray-500 mt-0.5">{description}</span>}
        </>
      ) : (
        <>
          {icon && <span>{icon}</span>}
          {name}
        </>
      )}
    </span>
  );
}
