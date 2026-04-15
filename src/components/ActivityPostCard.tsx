import { Link } from "@tanstack/react-router";
import { ExternalLink, Calendar, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ActivityPost } from "@/store/activityPosts";
import { InterestBadge } from "@/components/InterestBadge";

interface ActivityPostCardProps {
  post: ActivityPost;
  showAuthor?: boolean;
  onDelete?: (postId: string) => void;
  index?: number;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "I dag";
  if (diffDays === 1) return "I går";
  if (diffDays < 7) return `${diffDays} dage siden`;
  return date.toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: diffDays > 365 ? "numeric" : undefined,
  });
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  strava: { label: "Strava", color: "bg-[#FC4C02] text-white" },
  manual: { label: "Manuel", color: "bg-gray-100 text-gray-600" },
};

export function ActivityPostCard({
  post,
  showAuthor = true,
  onDelete,
  index = 0,
}: ActivityPostCardProps) {
  const sourceInfo = SOURCE_LABELS[post.source] || SOURCE_LABELS.manual;

  return (
    <div
      className="card-reveal rounded-2xl border border-gray-100 bg-white p-5 transition-all duration-200"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Header: author + source + date */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {showAuthor && post.profile && (
            <>
              <Link
                to="/buddy/$slug"
                params={{ slug: post.profile.slug }}
                className="no-underline"
              >
                <Avatar className="h-7 w-7 text-xs">
                  {post.profile.avatar_url && (
                    <AvatarImage src={post.profile.avatar_url} alt={post.profile.first_name || ""} />
                  )}
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {post.profile.first_name?.slice(0, 2).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <Link
                to="/buddy/$slug"
                params={{ slug: post.profile.slug }}
                className="text-sm font-medium text-gray-900 hover:text-blue-900 no-underline"
              >
                {post.profile.first_name || "Ukendt"}
              </Link>
            </>
          )}

          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${sourceInfo.color}`}
          >
            {post.source === "strava" && (
              <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
            )}
            {sourceInfo.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {post.activity_date && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatRelativeDate(post.activity_date)}
            </span>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(post.id)}
              className="text-gray-300 hover:text-red-500 transition-colors p-1"
              title="Slet indlæg"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{post.title}</h3>

      {/* Description */}
      {post.description && (
        <p className="text-sm text-gray-600 mb-3">{post.description}</p>
      )}

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto">
          {post.media.map((m) => (
            <img
              key={m.id}
              src={m.url}
              alt=""
              className="h-32 w-auto rounded-lg object-cover flex-shrink-0"
              loading="lazy"
            />
          ))}
        </div>
      )}

      {/* Footer: interest badge + source link */}
      <div className="flex items-center justify-between">
        {post.interest && (
          <InterestBadge name={post.interest.interest_da} />
        )}

        {post.source_url && (
          <a
            href={post.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            Se på {sourceInfo.label}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}
