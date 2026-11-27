export interface Message {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  /** Set when the receiver has seen it (had the chat open) */
  read_at?: string | null;
  /** Set when the sender unsent it; an unsent text message is blanked */
  unsent_at?: string | null;
}

/** A chat thread in the inbox (grouped by buddy) */
export interface ChatThread {
  buddy_id: string;
  buddy_name: string | null;
  last_message: Message;
}
