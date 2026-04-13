import { useEffect, useState, useRef, useCallback } from "react";
import { X, Send, Hand, Minimize2, Maximize2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { useChatPopupStore } from "../store/chatPopup";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import type { Message } from "../lib/chat-types";
import { toast } from "sonner";

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

export function ChatPopup() {
  const { isOpen, buddyId, buddyName, closeChat } = useChatPopupStore();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buddySlug, setBuddySlug] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevBuddyIdRef = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Reset state when buddy changes
  useEffect(() => {
    if (buddyId !== prevBuddyIdRef.current) {
      setMessages([]);
      setNewMessage("");
      setLoading(true);
      setMinimized(false);
      setBuddySlug(null);
      prevBuddyIdRef.current = buddyId;
    }
  }, [buddyId]);

  // Escape key closes chat
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeChat();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeChat]);

  // Load buddy slug for profile link
  useEffect(() => {
    if (!buddyId || !isOpen) return;

    supabase
      .from("profiles")
      .select("slug")
      .eq("profile_id", buddyId)
      .single()
      .then(({ data }) => {
        if (data) setBuddySlug(data.slug);
      });
  }, [buddyId, isOpen]);

  // Load existing messages
  useEffect(() => {
    if (!user || !buddyId || !isOpen) return;

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
  }, [user, buddyId, isOpen]);

  // Realtime subscription
  useEffect(() => {
    if (!user || !buddyId || !isOpen) return;

    const channel = supabase
      .channel(`chat-popup:${buddyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const msg = payload.new as Message;
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
  }, [user, buddyId, isOpen]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input when opened or after messages finish loading
  useEffect(() => {
    if (isOpen && !minimized && !loading) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen, minimized, loading, buddyId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || !user || !buddyId || sending) return;

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
      toast.error("Kunne ikke sende besked");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  function shouldShowDateSeparator(index: number): boolean {
    if (index === 0) return true;
    const current = new Date(messages[index].created_at).toDateString();
    const previous = new Date(messages[index - 1].created_at).toDateString();
    return current !== previous;
  }

  if (!isOpen || !buddyId) return null;

  const buddyInitials = buddyName ? buddyName.slice(0, 2).toUpperCase() : "?";

  // Minimized state — just show the header bar
  if (minimized) {
    return (
      <div className="fixed bottom-0 right-4 z-50 w-80 sm:w-96 animate-in slide-in-from-bottom-2 duration-200">
        <button
          onClick={() => setMinimized(false)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-t-xl shadow-lg hover:bg-blue-800 transition-colors cursor-pointer"
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-blue-400 text-white text-xs">{buddyInitials}</AvatarFallback>
          </Avatar>
          <span className="font-medium text-sm flex-1 text-left truncate">{buddyName || "Anonym"}</span>
          <X
            className="w-4 h-4 opacity-70 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              closeChat();
            }}
            aria-label="Luk chat"
          />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 right-4 z-50 w-80 sm:w-96 flex flex-col bg-white rounded-t-xl shadow-2xl border border-gray-200 animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-blue-600 rounded-t-xl shrink-0">
        {buddySlug ? (
          <Link
            to="/buddy/$slug"
            params={{ slug: buddySlug }}
            className="flex items-center gap-2 flex-1 min-w-0 no-underline"
            onClick={closeChat}
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-blue-400 text-white text-xs">{buddyInitials}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm text-white truncate">{buddyName || "Anonym"}</span>
          </Link>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-blue-400 text-white text-xs">{buddyInitials}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm text-white truncate">{buddyName || "Anonym"}</span>
          </div>
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          <Link
            to="/chat/$buddyId"
            params={{ buddyId }}
            className="p-2.5 -m-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Åbn fuld chat"
            aria-label="Åbn fuld chat"
            onClick={closeChat}
          >
            <Maximize2 className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setMinimized(true)}
            className="p-2.5 -m-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Minimer"
            aria-label="Minimer chat"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={closeChat}
            className="p-2.5 -m-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Luk"
            aria-label="Luk chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1" style={{ height: 320 }}>
        {loading && (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : ""}`}>
                <div className={`h-8 rounded-2xl ${i % 2 === 0 ? "bg-blue-100 w-32" : "bg-gray-100 w-40"}`} />
              </div>
            ))}
          </div>
        )}

        {!loading && messages.length === 0 && <div className="text-center text-gray-400 text-xs py-8">Skriv den første besked! 👋</div>}

        {messages.map((msg, index) => {
          const isMe = msg.sender_id === user?.id;
          const isHighfive = msg.content.trim() === "👋";

          return (
            <div key={msg.id}>
              {shouldShowDateSeparator(index) && (
                <div className="text-center text-xs text-gray-400 py-2">{formatDateSeparator(msg.created_at)}</div>
              )}
              <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}>
                {isHighfive ? (
                  <div
                    className={`message-fade-in flex flex-col items-center justify-center w-14 h-14 rounded-2xl ${
                      isMe ? "bg-blue-600 rounded-br-md" : "bg-gray-100 rounded-bl-md"
                    }`}
                  >
                    <Hand className={`w-7 h-7 -rotate-15 ${isMe ? "text-white" : "text-gray-700"}`} strokeWidth={1.5} />
                    <p className={`text-[10px] mt-0.5 ${isMe ? "text-blue-200" : "text-gray-400"}`}>{formatTime(msg.created_at)}</p>
                  </div>
                ) : (
                  <div
                    className={`message-fade-in max-w-[80%] px-3 py-1.5 rounded-2xl ${
                      isMe ? "bg-blue-600 text-white rounded-br-md" : "bg-gray-100 text-gray-900 rounded-bl-md"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-base">{msg.content}</p>
                    <p className={`text-[10px] mt-0.5 ${isMe ? "text-blue-200" : "text-gray-400"}`}>{formatTime(msg.created_at)}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 px-3 py-2.5 border-t bg-gray-50 rounded-b-none">
        <Input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Skriv en besked..."
          className="flex-1 rounded-full bg-white"
        />
        <Button type="submit" disabled={!newMessage.trim() || sending} size="icon" className="rounded-full h-9 w-9 shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
