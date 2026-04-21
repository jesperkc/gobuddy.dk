import { create } from "zustand";
import { supabase } from "../lib/supabase";

export interface ActivityPostComment {
  id: string;
  profile_id: string;
  body: string;
  created_at: string;
  profile: {
    profile_id: string;
    first_name: string | null;
    slug: string;
    avatar_url: string | null;
  } | null;
}

export interface ActivityPost {
  id: string;
  profile_id: string;
  title: string;
  description: string | null;
  source: string;
  source_url: string | null;
  activity_date: string | null;
  created_at: string;
  private: boolean;
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
  /** Profile IDs of users who liked the post */
  likes: { profile_id: string }[];
  comments: ActivityPostComment[];
}

const POST_SELECT = `
  id, profile_id, title, description, source, source_url, activity_date, created_at, private,
  interest:interests (interest_id, interest_da, icon),
  profile:profiles!profile_id (profile_id, first_name, slug, avatar_url),
  media:activity_post_media (id, url, media_type),
  likes:activity_post_likes (profile_id),
  comments:activity_post_comments (
    id, profile_id, body, created_at,
    profile:profiles!profile_id (profile_id, first_name, slug, avatar_url)
  )
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

  /** Toggle a like (highfive) on a post for the current user */
  toggleLike: (postId: string) => Promise<void>;

  /** Add a comment to a post */
  addComment: (postId: string, body: string) => Promise<void>;

  /** Delete a comment (own comment, or any comment on own post) */
  deleteComment: (postId: string, commentId: string) => Promise<void>;
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
      } else {
        // Public feed: never include private posts (even one's own)
        query = query.eq("private", false);
      }

      const { data, error } = await query;
      if (error) throw error;

      const posts = (data as unknown as ActivityPost[]).map((p) => ({
        ...p,
        comments: [...(p.comments || [])].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        ),
      }));

      set({ posts, loading: false });
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
      typed.likes = typed.likes || [];
      typed.comments = typed.comments || [];
      set({ posts: [typed, ...get().posts] });
      return typed;
    } catch (err: unknown) {
      console.error("Failed to create activity post:", err);
      return null;
    }
  },

  deletePost: async (postId: string) => {
    try {
      const { error } = await supabase.from("activity_posts").delete().eq("id", postId);
      if (error) throw error;

      set({ posts: get().posts.filter((p) => p.id !== postId) });
      return true;
    } catch (err: unknown) {
      console.error("Failed to delete activity post:", err);
      return false;
    }
  },

  toggleLike: async (postId: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const posts = get().posts;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const liked = post.likes.some((l) => l.profile_id === user.id);

    // Optimistic update
    set({
      posts: posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              likes: liked
                ? p.likes.filter((l) => l.profile_id !== user.id)
                : [...p.likes, { profile_id: user.id }],
            }
          : p,
      ),
    });

    try {
      if (liked) {
        const { error } = await supabase
          .from("activity_post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("profile_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("activity_post_likes")
          .insert({ post_id: postId, profile_id: user.id });
        if (error) throw error;
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
      // Revert
      set({ posts });
    }
  },

  addComment: async (postId: string, body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("activity_post_comments")
        .insert({ post_id: postId, profile_id: user.id, body: trimmed })
        .select(`
          id, profile_id, body, created_at,
          profile:profiles!profile_id (profile_id, first_name, slug, avatar_url)
        `)
        .single();

      if (error) throw error;

      const comment = data as unknown as ActivityPostComment;
      set({
        posts: get().posts.map((p) =>
          p.id === postId ? { ...p, comments: [...p.comments, comment] } : p,
        ),
      });
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  },

  deleteComment: async (postId: string, commentId: string) => {
    const posts = get().posts;
    // Optimistic
    set({
      posts: posts.map((p) =>
        p.id === postId ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) } : p,
      ),
    });

    try {
      const { error } = await supabase
        .from("activity_post_comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;
    } catch (err) {
      console.error("Failed to delete comment:", err);
      set({ posts });
    }
  },
}));
