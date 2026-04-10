import { create } from "zustand";
import { supabase } from "../lib/supabase";

export interface ActivityPost {
  id: string;
  profile_id: string;
  title: string;
  description: string | null;
  source: string;
  source_url: string | null;
  activity_date: string | null;
  created_at: string;
  interest: {
    interest_id: string;
    interest_da: string;
    icon: string;
  } | null;
  profile: {
    profile_id: string;
    first_name: string | null;
    slug: string;
    avatar_url: string | null;
  };
  media: {
    id: string;
    url: string;
    media_type: string;
  }[];
}

const POST_SELECT = `
  id, profile_id, title, description, source, source_url, activity_date, created_at,
  interest:interests (interest_id, interest_da, icon),
  profile:profiles!profile_id (profile_id, first_name, slug, avatar_url),
  media:activity_post_media (id, url, media_type)
`;

interface ActivityPostsState {
  posts: ActivityPost[];
  loading: boolean;
  error: string | null;

  /** Load posts for the feed (all users) or for a specific profile */
  fetchPosts: (profileId?: string, limit?: number) => Promise<void>;

  /** Create a manual post */
  createPost: (data: {
    title: string;
    description?: string;
    interestId?: string;
    activityDate?: string;
  }) => Promise<ActivityPost | null>;

  /** Delete own post */
  deletePost: (postId: string) => Promise<boolean>;
}

export const useActivityPostsStore = create<ActivityPostsState>((set, get) => ({
  posts: [],
  loading: false,
  error: null,

  fetchPosts: async (profileId?: string, limit = 50) => {
    set({ loading: true, error: null });
    try {
      let query = supabase
        .from("activity_posts")
        .select(POST_SELECT)
        .order("activity_date", { ascending: false, nullsFirst: false })
        .limit(limit);

      if (profileId) {
        query = query.eq("profile_id", profileId);
      }

      const { data, error } = await query;
      if (error) throw error;

      set({ posts: data as unknown as ActivityPost[], loading: false });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : "Ukendt fejl", loading: false });
    }
  },

  createPost: async (data) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    try {
      const { data: post, error } = await supabase
        .from("activity_posts")
        .insert({
          profile_id: user.id,
          title: data.title,
          description: data.description || null,
          interest_id: data.interestId || null,
          activity_date: data.activityDate || new Date().toISOString(),
          source: "manual",
        })
        .select(POST_SELECT)
        .single();

      if (error) throw error;

      const typed = post as unknown as ActivityPost;
      set({ posts: [typed, ...get().posts] });
      return typed;
    } catch (err: unknown) {
      console.error("Failed to create activity post:", err);
      return null;
    }
  },

  deletePost: async (postId: string) => {
    try {
      const { error } = await supabase
        .from("activity_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      set({ posts: get().posts.filter((p) => p.id !== postId) });
      return true;
    } catch (err: unknown) {
      console.error("Failed to delete activity post:", err);
      return false;
    }
  },
}));
