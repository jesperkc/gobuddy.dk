import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useOnboardingStore } from "@/store/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CONFIRM_WORD = "SLET";

/**
 * Self-service account deletion (GDPR right to erasure). The delete-account
 * edge function removes the profile and everything tied to it, then we sign
 * out locally and send the visitor home.
 */
export function DeleteAccountSection() {
  const navigate = useNavigate();
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const confirmed = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  const deleteAccount = async () => {
    if (!confirmed) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>("delete-account", {
        method: "POST",
      });
      if (error || !data?.ok) throw new Error(data?.error ?? error?.message ?? "Ukendt fejl");

      // The server session is gone; clear what's left in this browser.
      await supabase.auth.signOut({ scope: "local" });
      resetOnboarding();
      toast.success("Din konto og alle dine data er slettet.");
      navigate({ to: "/" });
    } catch (err) {
      console.error("Error deleting account:", err);
      toast.error("Kunne ikke slette din konto. Prøv igen, eller skriv til hej@gobuddy.dk.");
      setDeleting(false);
    }
  };

  return (
    <section aria-labelledby="delete-account-heading" className="rounded-2xl border border-red-200 bg-white p-6">
      <h2 id="delete-account-heading" className="text-lg font-semibold text-gray-900">
        Slet konto
      </h2>
      <p className="mt-1 max-w-prose text-sm text-gray-600">
        Sletter din profil, dine interesser, beskeder, opslag, aktiviteter og en eventuel Strava-forbindelse. Det kan ikke fortrydes.
      </p>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (deleting) return;
          setOpen(next);
          if (!next) setConfirmText("");
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline" className="mt-4 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800">
            <Trash2 className="mr-2 h-4 w-4" />
            Slet min konto
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Slet din konto permanent?</DialogTitle>
            <DialogDescription>
              Alt, hvad du har lagt på GoBuddy, bliver slettet med det samme, og du bliver logget ud. Andre kan ikke længere finde dig
              eller se dine beskeder.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="delete-confirm">
              Skriv <span className="font-semibold">{CONFIRM_WORD}</span> for at bekræfte
            </Label>
            <Input
              id="delete-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              disabled={deleting}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={deleting}>
                Annuller
              </Button>
            </DialogClose>
            <Button variant="destructive" onClick={deleteAccount} disabled={!confirmed || deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sletter...
                </>
              ) : (
                "Slet konto permanent"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
