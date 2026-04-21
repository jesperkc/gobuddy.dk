import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Hand, MessageCircle, Send, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityPostsStore, type ActivityPost } from "@/store/activityPosts";

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "lige nu";
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} t`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} d`;
  return new Date(dateStr).toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

interface Props {
  post: ActivityPost;
}

export function ActivityPostInteractions({ post }: Props) {
  const { user } = useAuth();
  const { toggleLike, addComment, deleteComment } = useActivityPostsStore();
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const liked = !!user && post.likes.some((l) => l.profile_id === user.id);
  const likeCount = post.likes.length;
  const canDeleteComment = (commentProfileId: string) => !!user && (commentProfileId === user.id || post.profile_id === user.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || submitting) return;
    setSubmitting(true);
    await addComment(post.id, draft);
    setDraft("");
    setSubmitting(false);
  };

  return (
    <div className="mt-4 pt-3 border-t border-gray-100">
      {/* Action bar */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <button
          type="button"
          onClick={() => toggleLike(post.id)}
          disabled={!user}
          aria-pressed={liked}
          aria-label={liked ? "Fjern highfive" : "Giv highfive"}
          className={`group inline-flex items-center gap-1.5 transition-colors ${
            liked ? "text-green-600" : "hover:text-gray-700"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Hand className={`h-4 w-4 transition-transform group-hover:scale-110 ${liked ? "fill-green-100" : ""}`} />
          <span className="font-medium tabular-nums">{likeCount}</span>
          <span className="hidden sm:inline">{likeCount === 1 ? "Highfive" : "Highfives"}</span>
        </button>

        <span className="inline-flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4" />
          <span className="font-medium tabular-nums">{post.comments.length}</span>
          <span className="hidden sm:inline">{post.comments.length === 1 ? "kommentar" : "kommentarer"}</span>
        </span>
      </div>

      {/* Comments list */}
      {post.comments.length > 0 && (
        <ul className="space-y-3 mb-3">
          {post.comments.map((c) => (
            <li key={c.id} className="flex items-start gap-2 group">
              {c.profile && (
                <Link to="/buddy/$slug" params={{ slug: c.profile.slug }} className="no-underline shrink-0">
                  <Avatar className="h-7 w-7 text-[10px]">
                    {c.profile.avatar_url && <AvatarImage src={c.profile.avatar_url} alt={c.profile.first_name || ""} />}
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {c.profile.first_name?.slice(0, 2).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              )}

              <div className="flex-1 min-w-0">
                <div className="rounded-2xl bg-gray-50 px-3 py-2">
                  {c.profile && (
                    <Link
                      to="/buddy/$slug"
                      params={{ slug: c.profile.slug }}
                      className="text-xs font-medium text-gray-900 hover:text-blue-900 no-underline"
                    >
                      {c.profile.first_name || "Ukendt"}
                    </Link>
                  )}
                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{c.body}</p>
                </div>
                <div className="flex items-center gap-3 mt-1 px-3">
                  <span className="text-[10px] text-gray-400">{timeAgo(c.created_at)}</span>
                  {canDeleteComment(c.profile_id) && (
                    <button
                      type="button"
                      onClick={() => deleteComment(post.id, c.id)}
                      className="text-[10px] text-gray-400 hover:text-red-500 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Slet kommentar"
                    >
                      <Trash2 className="h-3 w-3" />
                      Slet
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Composer */}
      {user && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Skriv en kommentar..."
            maxLength={2000}
            className="flex-1 rounded-full bg-gray-50 border border-gray-100 px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition"
          />
          <button
            type="submit"
            disabled={!draft.trim() || submitting}
            aria-label="Send kommentar"
            className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  );
}
