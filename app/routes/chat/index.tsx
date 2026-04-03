import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, ArrowRight } from "lucide-react";
import { DefaultLayout } from "../../../src/components/AppShell";
import { ProtectedRoute } from "../../../src/components/ProtectedRoute";
import { useAuth } from "../../../src/contexts/AuthContext";
import { supabase } from "../../../src/lib/supabase";
import { Avatar, AvatarFallback } from "../../../src/components/ui/avatar";
import type { Message, ChatThread } from "../../../src/lib/chat-types";

function InboxPage() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchThreads() {
      setLoading(true);
      try {
        // Fetch all messages involving the current user, newest first
        const { data: messages, error } = await supabase
          .from("messages")
          .select("*")
          .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!messages?.length) {
          setThreads([]);
          setLoading(false);
          return;
        }

        // Group by the other user, keeping only the most recent message per buddy
        const threadMap = new Map<string, Message>();
        for (const msg of messages) {
          const buddyId = msg.sender_id === user!.id ? msg.receiver_id : msg.sender_id;
          if (!threadMap.has(buddyId)) {
            threadMap.set(buddyId, msg);
          }
        }

        // Fetch buddy names
        const buddyIds = Array.from(threadMap.keys());
        const { data: profiles } = await supabase
          .from("profiles")
          .select("profile_id, first_name")
          .in("profile_id", buddyIds);

        const nameMap = new Map<string, string | null>();
        for (const p of profiles || []) {
          nameMap.set(p.profile_id, p.first_name);
        }

        const result: ChatThread[] = buddyIds.map((buddyId) => ({
          buddy_id: buddyId,
          buddy_name: nameMap.get(buddyId) || null,
          last_message: threadMap.get(buddyId)!,
        }));

        setThreads(result);
      } catch (err) {
        console.error("Error fetching threads:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchThreads();
  }, [user]);

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) return "Lige nu";
    if (diffHours < 24) return `${Math.floor(diffHours)}t siden`;
    if (diffHours < 48) return "I går";
    return date.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
  }

  return (
    <DefaultLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl flex items-center gap-2">
            <MessageCircle className="w-8 h-8" />
            Beskeder
          </h1>
          <p className="text-gray-500 mt-1">Dine samtaler med buddies</p>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && threads.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <MessageCircle className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h2 className="text-lg font-medium mb-1">Ingen beskeder endnu</h2>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Find en buddy og foreslå et meetup for at starte en samtale!
            </p>
            <Link
              to="/discover"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 mt-4 text-sm font-medium"
            >
              Find buddies
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {!loading && threads.length > 0 && (
          <div className="space-y-2">
            {threads.map((thread) => {
              const initials = thread.buddy_name
                ? thread.buddy_name.slice(0, 2).toUpperCase()
                : "?";

              return (
                <Link
                  key={thread.buddy_id}
                  to="/chat/$buddyId"
                  params={{ buddyId: thread.buddy_id }}
                  className="flex items-center gap-3 rounded-xl border p-4 hover:bg-gray-50 transition-colors no-underline text-inherit"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {thread.buddy_name || "Anonym"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTime(thread.last_message.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-0.5">
                      {thread.last_message.sender_id === user?.id ? "Dig: " : ""}
                      {thread.last_message.content}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DefaultLayout>
  );
}

function ProtectedInboxPage() {
  return (
    <ProtectedRoute redirectTo="/">
      <InboxPage />
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/chat/")({
  component: ProtectedInboxPage,
});
