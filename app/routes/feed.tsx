import { createFileRoute } from "@tanstack/react-router";
import { PageTitle } from "@/components/PageTitle";
import { useEffect, useState } from "react";
import { Plus, Frown } from "lucide-react";
import { DefaultLayout } from "../../src/components/AppShell";
import { ProtectedRoute, type AuthedProps } from "../../src/components/ProtectedRoute";
import { useActivityPostsStore, type ActivityPost } from "../../src/store/activityPosts";
import { ActivityPostCard } from "../../src/components/ActivityPostCard";
import { Button } from "../../src/components/ui/button";
import { Skeleton } from "../../src/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { InterestIcon } from "@/components/InterestIcon";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "../../src/lib/supabase";
import { RequireVerifiedEmail } from "../../src/components/EmailVerification";
import { toast } from "sonner";

// ── Create post form ───────────────────────────────────────────────

interface InterestOption {
  interest_id: string;
  interest_da: string;
  icon: string;
  category?: string;
}

function CreatePostForm({
  user,
  onCreated,
  onCancel,
}: {
  user: AuthedProps["user"];
  onCreated: (post: ActivityPost) => void;
  onCancel: () => void;
}) {
  const { createPost } = useActivityPostsStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [interestId, setInterestId] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [interests, setInterests] = useState<InterestOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_interests")
      .select("interest_id, is_non_interest, interests (interest_id, interest_da, icon, category)")
      .eq("profile_id", user.id)
      .eq("is_non_interest", false)
      .then(({ data }) => {
        if (data) {
          setInterests(
            data.filter((ui: Record<string, unknown>) => ui.interests).map((ui: Record<string, unknown>) => ui.interests as InterestOption),
          );
        }
      });
  }, [user]);

  const isSport = interests.find((i) => i.interest_id === interestId)?.category === "sport";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    const post = await createPost({
      title: title.trim(),
      description: description.trim() || undefined,
      interestId: interestId || undefined,
      distanceM: isSport && Number(distanceKm) > 0 ? Math.round(Number(distanceKm.replace(",", ".")) * 1000) : undefined,
      durationS: isSport && Number(durationMin) > 0 ? Math.round(Number(durationMin) * 60) : undefined,
    });

    if (post) {
      toast.success("Indlæg oprettet!");
      onCreated(post);
    } else {
      toast.error("Kunne ikke oprette indlæg");
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 mb-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Nyt indlæg</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Hvad lavede du?"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Fortæl mere om din aktivitet..."
          rows={3}
          className="resize-none"
        />
      </div>

      {interests.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Interesse</label>
          <Select value={interestId} onValueChange={(value) => setInterestId(value === "__none__" ? "" : value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Vælg interesse (valgfrit)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Vælg interesse (valgfrit)</SelectItem>
              {interests.map((i) => (
                <SelectItem key={i.interest_id} value={i.interest_id}>
                  <span className="inline-flex items-center gap-2">
                    <InterestIcon icon={i.icon} size={14} />
                    {i.interest_da}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isSport && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="post-distance" className="block text-sm font-medium text-gray-700 mb-1">
              Distance (km)
            </label>
            <Input id="post-distance" type="number" inputMode="decimal" min="0" step="0.1" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} />
          </div>
          <div>
            <label htmlFor="post-duration" className="block text-sm font-medium text-gray-700 mb-1">
              Varighed (min)
            </label>
            <Input id="post-duration" type="number" inputMode="numeric" min="0" step="1" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={submitting || !title.trim()}>
          {submitting ? "Opretter..." : "Opret indlæg"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuller
        </Button>
      </div>
    </form>
  );
}

// ── Feed page ──────────────────────────────────────────────────────

function FeedPage({ user }: AuthedProps) {
  const { posts, loading, error, fetchPosts } = useActivityPostsStore();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const limit = 50;

  useEffect(() => {
    fetchPosts(undefined, limit);
  }, [fetchPosts]);

  const handleCreated = () => {
    setShowCreateForm(false);
    fetchPosts(undefined, limit);
  };

  return (
    <DefaultLayout
      header={
        <div className="flex items-center justify-between">
          <div>
            <PageTitle>Feed</PageTitle>
            <p className="text-gray-500 mt-1">Se hvad andre buddies har været i gang med</p>
          </div>
          {!showCreateForm && (
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Opret
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Create form */}
        {showCreateForm && <CreatePostForm user={user} onCreated={handleCreated} onCancel={() => setShowCreateForm(false)} />}

        {/* Content */}
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {!loading && !error && posts.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Frown className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">Ingen indlæg endnu</p>
            <p className="text-sm mt-1">Tilslut Strava eller opret dit første indlæg!</p>
          </div>
        )}

        {!loading && posts.length > 0 && (
          <div className="space-y-4">
            {posts.map((post, i) => (
              <ActivityPostCard
                key={post.id}
                post={post}
                showAuthor={true}
                onDelete={
                  post.profile_id === user?.id
                    ? async (id) => {
                        if (!confirm("Slet dette indlæg?")) return;
                        const { deletePost } = useActivityPostsStore.getState();
                        const ok = await deletePost(id);
                        if (ok) toast.success("Indlæg slettet");
                        else toast.error("Kunne ikke slette indlæg");
                      }
                    : undefined
                }
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </DefaultLayout>
  );
}

function ProtectedFeedPage() {
  return (
    <ProtectedRoute redirectTo="/login">
      {(props) => (
        <RequireVerifiedEmail title="Bekræft din email for at se feedet">
          <FeedPage {...props} />
        </RequireVerifiedEmail>
      )}
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/feed")({
  component: ProtectedFeedPage,
});
