const sizes = {
  sm: { few: "text-5xl", many: "text-3xl", time: "text-[10px]" },
  lg: { few: "text-6xl", many: "text-4xl", time: "text-xs" },
};

/**
 * A message that is only emoji (a highfive 👋, "😂🙌", ...): shown big and without
 * a chat bubble, like in Messenger. Up to three emoji are extra big.
 */
export function EmojiMessage({
  content,
  count,
  isMe,
  time,
  size = "sm",
}: {
  content: string;
  count: number;
  isMe: boolean;
  time: string;
  size?: "sm" | "lg";
}) {
  const s = sizes[size];
  return (
    <div className={`message-fade-in flex min-w-0 flex-col ${isMe ? "items-end" : "items-start"}`}>
      <p className={`${count <= 3 ? s.few : s.many} break-words leading-tight ${isMe ? "text-right" : ""}`}>{content.trim()}</p>
      <p className={`${s.time} mt-1 text-gray-400`}>{time}</p>
    </div>
  );
}
