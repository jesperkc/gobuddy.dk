import { Link, type LinkProps } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  /** Optional "see all" destination; the link only renders when set. */
  to?: LinkProps["to"];
  linkLabel?: string;
  id?: string;
}

/** The one heading row for page sections: title left, quiet "Se alle" link right. */
export function SectionHeader({ title, to, linkLabel = "Se alle", id }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <h2 id={id} className="text-lg font-medium">
        {title}
      </h2>
      {to && (
        <Link to={to} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          {linkLabel}
          <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}
