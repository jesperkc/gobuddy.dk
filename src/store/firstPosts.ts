import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeLocalStorage } from "../lib/ssr-utils";

export interface PostDraft {
  title: string;
  description: string;
  /** Local date the activity happened, YYYY-MM-DD. */
  activityDate?: string;
}

interface FirstPostsState {
  /** Drafts and skips belong to one account; a different user starts clean. */
  userId: string | null;
  /** interest_id -> draft, published automatically once the email is verified. */
  drafts: Record<string, PostDraft>;
  skipped: string[];
  bioSkipped: boolean;
  /** Last AI-written bio suggestion, kept so a reload doesn't spend another request. */
  bioSuggestion: string | null;
  saveDraft: (userId: string, interestId: string, draft: PostDraft) => void;
  removeDraft: (interestId: string) => void;
  skip: (userId: string, interestId: string) => void;
  skipBio: (userId: string) => void;
  setBioSuggestion: (userId: string, text: string) => void;
}

const forUser = (state: FirstPostsState, userId: string) =>
  state.userId === userId ? state : { ...state, userId, drafts: {}, skipped: [], bioSkipped: false, bioSuggestion: null };

export const useFirstPostsStore = create<FirstPostsState>()(
  persist(
    (set) => ({
      userId: null,
      drafts: {},
      skipped: [],
      bioSkipped: false,
      bioSuggestion: null,
      saveDraft: (userId, interestId, draft) =>
        set((s) => {
          const base = forUser(s, userId);
          return { userId, skipped: base.skipped, bioSkipped: base.bioSkipped, bioSuggestion: base.bioSuggestion, drafts: { ...base.drafts, [interestId]: draft } };
        }),
      removeDraft: (interestId) =>
        set((s) => {
          const rest = { ...s.drafts };
          delete rest[interestId];
          return { drafts: rest };
        }),
      skip: (userId, interestId) =>
        set((s) => {
          const base = forUser(s, userId);
          return { userId, drafts: base.drafts, bioSkipped: base.bioSkipped, bioSuggestion: base.bioSuggestion, skipped: Array.from(new Set([...base.skipped, interestId])) };
        }),
      skipBio: (userId) =>
        set((s) => {
          const base = forUser(s, userId);
          return { userId, drafts: base.drafts, skipped: base.skipped, bioSuggestion: base.bioSuggestion, bioSkipped: true };
        }),
      setBioSuggestion: (userId, text) =>
        set((s) => {
          const base = forUser(s, userId);
          return { userId, drafts: base.drafts, skipped: base.skipped, bioSkipped: base.bioSkipped, bioSuggestion: text };
        }),
    }),
    {
      name: "gobuddy-first-posts",
      storage: createJSONStorage(() => safeLocalStorage),
      // Rehydrate on the client after mount to avoid hydration mismatches.
      skipHydration: true,
    }
  )
);

export const rehydrateFirstPostsStore = () => useFirstPostsStore.persist.rehydrate();
