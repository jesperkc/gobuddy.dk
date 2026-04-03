import { create } from "zustand";

interface ChatPopupState {
  isOpen: boolean;
  buddyId: string | null;
  buddyName: string | null;
  openChat: (buddyId: string, buddyName: string | null) => void;
  closeChat: () => void;
}

export const useChatPopupStore = create<ChatPopupState>((set) => ({
  isOpen: false,
  buddyId: null,
  buddyName: null,
  openChat: (buddyId, buddyName) => set({ isOpen: true, buddyId, buddyName }),
  closeChat: () => set({ isOpen: false, buddyId: null, buddyName: null }),
}));
