import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";

interface FollowedProfile {
  profile_id: string;
  slug: string;
  first_name: string | null;
  city: string | null;
  avatar_url: string | null;
}

interface Props {
  userId: string;
}

export function FollowingCard({ userId }: Props) {
  const [buddies, setBuddies] = useState<FollowedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchFollowing() {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from("follows")
        .select(
          `
          following_id,
          created_at,
          profile:profiles!follows_following_id_fkey (
            profile_id,
            slug,
            first_name,
            city,
            avatar_url
          )
          `,
        )
        .eq("follower_id", userId)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (queryError) {
        console.error("Error fetching followed buddies:", queryError);
        setError("Kunne ikke hente dine følger.");
        setBuddies([]);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = (data || []) as any[];
        setBuddies(rows.map((r) => r.profile).filter(Boolean) as FollowedProfile[]);
      }
      setLoading(false);
    }
    fetchFollowing();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex gap-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 w-12 rounded-full bg-gray-200" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (buddies.length === 0) {
    return <p className="text-sm text-gray-500">Du følger ikke nogen endnu.</p>;
  }

  return (
    <ul className="space-y-2">
      {buddies.map((b) => {
        const initials = b.first_name?.slice(0, 2).toUpperCase() || "?";
        return (
          <li key={b.profile_id}>
            <Link
              to="/buddy/$slug"
              params={{ slug: b.slug }}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-gray-50 px-3 py-2 no-underline text-inherit transition-colors"
            >
              <Avatar className="h-10 w-10">
                {b.avatar_url && <AvatarImage src={b.avatar_url} alt={b.first_name || ""} />}
                <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 truncate">{b.first_name || "Anonym"}</p>
                {b.city && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {b.city}
                  </p>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
