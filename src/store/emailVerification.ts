import { create } from "zustand";
import { supabase } from "../lib/supabase";

interface EmailVerificationState {
  /** null = not loaded yet */
  verified: boolean | null;
  dialogOpen: boolean;
  load: (userId: string) => Promise<void>;
  setVerified: (verified: boolean) => void;
  openDialog: () => void;
  closeDialog: () => void;
  reset: () => void;
}

export const useEmailVerificationStore = create<EmailVerificationState>((set) => ({
  verified: null,
  dialogOpen: false,
  load: async (userId) => {
    const { data, error } = await supabase.from("email_verifications").select("user_id").eq("user_id", userId).maybeSingle();
    if (error) {
      // Fail open in the UI so a hiccup doesn't lock everyone out; the database enforces the rule.
      console.error("Could not load email verification status:", error);
      set((s) => (s.verified === null ? { verified: true } : s));
      return;
    }
    set({ verified: !!data });
  },
  setVerified: (verified) => set({ verified }),
  openDialog: () => set({ dialogOpen: true }),
  closeDialog: () => set({ dialogOpen: false }),
  reset: () => set({ verified: null, dialogOpen: false }),
}));

/**
 * Gate for actions that need a verified email (messaging, hi5). Returns true
 * when the action may proceed; otherwise opens the verification dialog.
 * The database enforces the same rule, so this is only about UX.
 */
export function requireVerifiedEmail(): boolean {
  const { verified, openDialog } = useEmailVerificationStore.getState();
  if (verified === false) {
    openDialog();
    return false;
  }
  return true;
}
