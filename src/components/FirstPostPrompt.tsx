import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/track";
import { useUserProfileStore } from "@/store/userProfile";
import { useEmailVerificationStore } from "@/store/emailVerification";
import { useActivityPostsStore } from "@/store/activityPosts";
import { useFirstPostsStore } from "@/store/firstPosts";
import { FirstPostForm, type FirstPostValues } from "@/components/FirstPostForm";
import { toActivityTimestamp } from "@/lib/localDate";

/**
 * Asks a new user for one post about their latest activity, one interest at a
 * time. While the email is unverified the post is kept as a draft in the
 * browser and published automatically as soon as verification completes.
 *
 * Always mounted on /home so drafts get published even when `hidden`.
 */
export function FirstPostPrompt({ hidden = false }: { hidden?: boolean }) {
  const { user } = useAuth();
  const profile = useUserProfileStore((s) => s.profile);
  const verified = useEmailVerificationStore((s) => s.verified);
  const createPost = useActivityPostsStore((s) => s.createPost);
  const { userId: draftOwner, drafts, skipped, saveDraft, removeDraft, skip } = useFirstPostsStore();

  const [postedIds, setPostedIds] = useState<Set<string> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // After acting on one interest we wait for the next visit before asking about the next.
  const [doneThisVisit, setDoneThisVisit] = useState<"saved" | "published" | "skipped" | null>(null);
  const publishing = useRef(false);

  const myDrafts = useMemo(() => (user && draftOwner === user.id ? drafts : {}), [user, draftOwner, drafts]);
  const mySkipped = useMemo(() => (user && draftOwner === user.id ? skipped : []), [user, draftOwner, skipped]);

  const interests = useMemo(
    () =>
      (profile?.user_interests ?? [])
        .filter((ui) => !ui.is_non_interest && ui.interests)
        .map((ui) => ({ interest_id: ui.interest_id, name: ui.interests.interest_da, icon: ui.interests.icon })),
    [profile?.user_interests],
  );

  // Interests that already have a post by this user (own posts are always visible).
  useEffect(() => {
    if (!user) return;
    supabase
      .from("activity_posts")
      .select("interest_id")
      .eq("profile_id", user.id)
      .then(({ data }) => setPostedIds(new Set((data ?? []).map((p) => p.interest_id).filter((id): id is string => !!id))));
  }, [user]);

  // Publish saved drafts once the email is verified.
  useEffect(() => {
    if (!user || verified !== true || publishing.current) return;
    const entries = Object.entries(myDrafts);
    if (entries.length === 0) return;
    publishing.current = true;
    (async () => {
      for (const [interestId, draft] of entries) {
        const post = await createPost({
          title: draft.title,
          description: draft.description || undefined,
          interestId,
          activityDate: toActivityTimestamp(draft.activityDate),
        });
        if (post) {
          removeDraft(interestId);
          setPostedIds((prev) => new Set(prev).add(interestId));
          track("first_post_published", { source: "draft" });
          const name = interests.find((i) => i.interest_id === interestId)?.name;
          toast.success(name ? `Dit opslag om ${name} er nu delt` : "Dit opslag er nu delt");
        }
      }
      publishing.current = false;
    })();
  }, [user, verified, myDrafts, createPost, removeDraft, interests]);

  if (hidden || !user || postedIds === null || verified === null || interests.length === 0) return null;

  const pendingDrafts = Object.keys(myDrafts).length;
  const next = interests.find(
    (i) => !postedIds.has(i.interest_id) && !(i.interest_id in myDrafts) && !mySkipped.includes(i.interest_id),
  );
  const handled = interests.filter(
    (i) => postedIds.has(i.interest_id) || i.interest_id in myDrafts || mySkipped.includes(i.interest_id),
  ).length;

  const draftNotice =
    verified === false && pendingDrafts > 0 ? (
      <p className="flex items-center gap-2 text-sm text-blue-900 bg-blue-50 rounded-xl px-4 py-3">
        <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
        {pendingDrafts === 1 ? "Dit opslag er gemt" : `${pendingDrafts} opslag er gemt`} og går live, så snart du har bekræftet din email.
      </p>
    ) : null;

  if (doneThisVisit) {
    return (
      <div className="space-y-3">
        {draftNotice}
        <p className="flex items-center gap-3 text-sm text-gray-700 rounded-xl bg-gray-50 px-4 py-3">
          {doneThisVisit !== "skipped" && (
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          )}
          <span>
            {doneThisVisit === "skipped" ? "Okay, vi spørger ikke igen om den." : doneThisVisit === "published" ? "Dit opslag er delt." : "Tak!"}
            {next ? " Vi spørger om din næste interesse en anden gang." : ""}
          </span>
        </p>
      </div>
    );
  }

  if (!next) return draftNotice;

  const handleSave = async ({ title, description, activityDate }: FirstPostValues) => {
    if (submitting) return;
    setSubmitting(true);

    if (verified === true) {
      const post = await createPost({
        title,
        description: description || undefined,
        interestId: next.interest_id,
        activityDate: toActivityTimestamp(activityDate),
      });
      if (post) {
        setPostedIds((prev) => new Set(prev).add(next.interest_id));
        track("first_post_published", { source: "direct" });
        toast.success("Dit opslag er delt");
        setDoneThisVisit("published");
      } else {
        toast.error("Kunne ikke dele opslaget. Prøv igen.");
      }
    } else {
      saveDraft(user.id, next.interest_id, { title, description, activityDate });
      track("first_post_draft_saved");
      setDoneThisVisit("saved");
    }
    setSubmitting(false);
  };

  const handleSkip = () => {
    skip(user.id, next.interest_id);
    track("first_post_skipped");
    setDoneThisVisit("skipped");
  };

  return (
    <div className="space-y-3">
      {draftNotice}
      <FirstPostForm
        key={next.interest_id}
        interest={next}
        step={handled + 1}
        total={interests.length}
        verified={verified === true}
        submitting={submitting}
        onSave={handleSave}
        onSkip={handleSkip}
      />
    </div>
  );
}
