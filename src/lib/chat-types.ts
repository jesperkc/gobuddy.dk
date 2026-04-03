export interface Message {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

/** A chat thread in the inbox (grouped by buddy) */
export interface ChatThread {
  buddy_id: string;
  buddy_name: string | null;
  last_message: Message;
}
