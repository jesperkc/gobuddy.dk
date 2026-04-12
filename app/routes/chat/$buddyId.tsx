import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { ArrowLeft, Send, Hand } from "lucide-react";
import { DefaultLayout } from "../../../src/components/AppShell";
import { ProtectedRoute } from "../../../src/components/ProtectedRoute";
import { useAuth } from "../../../src/contexts/AuthContext";
import { supabase } from "../../../src/lib/supabase";
import { Button } from "../../../src/components/ui/button";
import { Avatar, AvatarFallback } from "../../../src/components/ui/avatar";
import { Input } from "@/components/ui/input";
import type { Message } from "../../../src/lib/chat-types";

function ChatPage() {
  const { buddyId } = Route.useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [buddyName, setBuddyName] = useState<string | null>(null);
  const [buddySlug, setBuddySlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load buddy profile name
  useEffect(() => {
    if (!buddyId) return;

    async function loadBuddy() {
      const { data } = await supabase.from("profiles").select("first_name, slug").eq("profile_id", buddyId).single();

      if (data) {
        setBuddyName(data.first_name);
        setBuddySlug(data.slug);
      }
    }

    loadBuddy();
  }, [buddyId]);

  // Load existing messages between me and buddy
  useEffect(() => {
    if (!user || !buddyId) return;

    async function loadMessages() {
      setLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${buddyId}),and(sender_id.eq.${buddyId},receiver_id.eq.${user!.id})`)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
      setLoading(false);
    }

    loadMessages();
  }, [user, buddyId]);

  // Subscribe to new messages via Realtime
  useEffect(() => {
    if (!user || !buddyId) return;

    const channel = supabase
      .channel(`chat:${buddyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const msg = payload.new as Message;
          // Only add if it's part of this conversation
          const isThisChat =
            (msg.sender_id === user!.id && msg.receiver_id === buddyId) || (msg.sender_id === buddyId && msg.receiver_id === user!.id);
          if (!isThisChat) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, buddyId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || !user || sending) return;

    setSending(true);
    setNewMessage("");

    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: buddyId,
        content,
      });

      if (error) throw error;
    } catch (err) {
      console.error("Error sending message:", err);
      setNewMessage(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("da-DK", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDateSeparator(dateStr: string) {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "I dag";
    if (date.toDateString() === yesterday.toDateString()) return "I går";
    return date.toLocaleDateString("da-DK", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  function shouldShowDateSeparator(index: number): boolean {
    if (index === 0) return true;
    const current = new Date(messages[index].created_at).toDateString();
    const previous = new Date(messages[index - 1].created_at).toDateString();
    return current !== previous;
  }

  const buddyInitials = buddyName ? buddyName.slice(0, 2).toUpperCase() : "?";

  return (
    <DefaultLayout>
      <div className="flex flex-col" style={{ height: "calc(100vh - 10rem)" }}>
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b">
          <Link to="/chat" className="text-gray-500 hover:text-gray-800">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link to="/buddy/$slug" params={{ slug: buddySlug || buddyId }} className="flex items-center gap-3 no-underline text-inherit">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">{buddyInitials}</AvatarFallback>
            </Avatar>
            <p className="font-medium leading-tight">{buddyName || "Anonym"}</p>
          </Link>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-1">
          {loading && (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : ""}`}>
                  <div className={`h-10 rounded-2xl ${i % 2 === 0 ? "bg-blue-100 w-40" : "bg-gray-100 w-48"}`} />
                </div>
              ))}
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-12">Skriv den første besked for at starte samtalen! 👋</div>
          )}

          {messages.map((msg, index) => {
            const isMe = msg.sender_id === user?.id;
            const isHighfive = msg.content.trim() === "👋";

            return (
              <div key={msg.id}>
                {shouldShowDateSeparator(index) && (
                  <div className="text-center text-xs text-gray-400 py-3">{formatDateSeparator(msg.created_at)}</div>
                )}
                <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}>
                  {isHighfive ? (
                    <div
                      className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl ${
                        isMe ? "bg-blue-600 rounded-br-md" : "bg-gray-100 rounded-bl-md"
                      }`}
                    >
                      <Hand className={`w-10 h-10 -rotate-15 ${isMe ? "text-white" : "text-gray-700"}`} strokeWidth={1.5} />
                      <p className={`text-xs mt-1 ${isMe ? "text-blue-200" : "text-gray-400"}`}>{formatTime(msg.created_at)}</p>
                    </div>
                  ) : (
                    <div
                      className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                        isMe ? "bg-blue-600 text-white rounded-br-md" : "bg-gray-100 text-gray-900 rounded-bl-md"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={`text-xs mt-1 ${isMe ? "text-blue-200" : "text-gray-400"}`}>{formatTime(msg.created_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex items-center gap-2 pt-3 border-t">
          <Input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Skriv en besked..."
            className="flex-1 rounded-full"
            autoFocus
          />
          <Button type="submit" disabled={!newMessage.trim() || sending} size="icon" className="rounded-full h-10 w-10 shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </DefaultLayout>
  );
}

function ProtectedChatPage() {
  return (
    <ProtectedRoute redirectTo="/">
      <ChatPage />
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/chat/$buddyId")({
  component: ProtectedChatPage,
});
