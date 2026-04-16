import { cn } from "@/lib/utils";
import { INTEREST_ICON_PATHS } from "./interest-icons";

interface InterestIconProps {
  /** The slug stored in interests.icon (matches a key in INTEREST_ICON_PATHS). */
  icon?: string | null;
  /** Pixel size (both width & height). Defaults to 20. */
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Renders the monochrome SVG icon for an interest inline, so `currentColor`
 * on stroke/fill inherits from the surrounding element. Falls back silently
 * if the slug is unknown or empty.
 */
export function InterestIcon({ icon, size = 20, className, title }: InterestIconProps) {
  if (!icon) return null;
  const paths = INTEREST_ICON_PATHS[icon];
  if (!paths) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("inline-block shrink-0", className)}
    >
      {paths}
    </svg>
  );
}

