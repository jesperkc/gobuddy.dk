import { useEffect, useState } from "react";
import { Lock, MailCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { translateAuthError } from "@/lib/auth-errors";
import { track } from "@/lib/track";
import { useEmailVerificationStore } from "@/store/emailVerification";
import { Button } from "@/components/ui/button";
import { DefaultLayout } from "@/components/AppShell";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const RESEND_COOLDOWN_SECONDS = 30;

/** Loads verification status for the signed-in user and hosts the "send me a link" dialog. */
export function EmailVerificationDialog() {
  const { user } = useAuth();
  const { verified, dialogOpen, load, reset, closeDialog } = useEmailVerificationStore();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.id) load(user.id);
    else reset();
  }, [user?.id, load, reset]);

  useEffect(() => {
    if (!dialogOpen) {
      setSent(false);
      setError("");
    }
  }, [dialogOpen]);

  // The link usually opens in a new tab; pick up the result here without a reload.
  useEffect(() => {
    if (!sent || !user?.id) return;
    const id = window.setInterval(() => load(user.id), 3000);
    return () => window.clearInterval(id);
  }, [sent, user?.id, load]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  if (!user?.email || verified !== false) return null;
  const email = user.email;

  const sendLink = async () => {
    if (busy || cooldown > 0) return;
    setError("");
    setBusy(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/complete` },
      });
      if (otpError) throw otpError;
      setSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      track("verify_link_sent");
    } catch (err) {
      setError(err instanceof Error ? translateAuthError(err.message) : "Der opstod en fejl. Prøv igen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => (open ? null : closeDialog())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bekræft din email</DialogTitle>
          <DialogDescription>
            Du skal bekræfte {email}, før du kan sende beskeder og highfives. Vi sender dig et link.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Vi har sendt et link til <span className="font-medium">{email}</span>. Klik på det for at bekræfte — tjek også dit spamfilter.
            </p>
            <Button type="button" variant="outline" onClick={sendLink} disabled={busy || cooldown > 0} className="w-full rounded-full">
              {cooldown > 0 ? `Send igen om ${cooldown}s` : "Send linket igen"}
            </Button>
          </div>
        ) : (
          <Button onClick={sendLink} disabled={busy} className="rounded-full bg-gray-900 hover:bg-gray-800">
            {busy ? "Sender..." : "Send mig et link"}
          </Button>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Slim notice shown while the email is unverified. */
export function VerifyEmailBanner() {
  const verified = useEmailVerificationStore((s) => s.verified);
  const openDialog = useEmailVerificationStore((s) => s.openDialog);
  if (verified !== false) return null;

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center gap-3">
      <MailCheck className="w-5 h-5 text-blue-700 shrink-0 hidden sm:block" aria-hidden="true" />
      <p className="text-sm text-blue-900 flex-1">
        <span className="font-medium">Bekræft din email for at se buddies i nærheden og feedet.</span> Indtil da kan du gøre din profil klar.
      </p>
      <Button onClick={openDialog} size="sm" className="rounded-full bg-blue-700 hover:bg-blue-800 text-white self-start sm:self-auto">
        Bekræft nu
      </Button>
    </div>
  );
}

/** Quiet inline note for a section that is locked until the email is verified. No button: the banner carries the one CTA. */
export function LockedNote() {
  return (
    <p className="flex items-center gap-2 text-sm text-gray-500">
      <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
      Låses op, når du har bekræftet din email.
    </p>
  );
}

/** Full-page replacement for content that unverified users may not see (other people's profiles). */
export function LockedUntilVerified({ title = "Bekræft din email for at se andre" }: { title?: string }) {
  const openDialog = useEmailVerificationStore((s) => s.openDialog);
  return (
    <section className="rounded-2xl bg-gray-50 text-center p-8 sm:p-12">
      <Lock className="w-6 h-6 text-gray-500 mx-auto mb-3" aria-hidden="true" />
      <h2 className="font-medium mb-1">{title}</h2>
      <p className="text-sm text-gray-600 mb-4">Det beskytter alle på GoBuddy mod falske profiler. Det tager kun et øjeblik.</p>
      <Button onClick={openDialog} className="rounded-full bg-gray-900 hover:bg-gray-800 text-white">
        Bekræft min email
      </Button>
    </section>
  );
}

/** Renders children once the email is verified; the lock screen while it isn't. */
export function RequireVerifiedEmail({ children, title }: { children: React.ReactNode; title?: string }) {
  const verified = useEmailVerificationStore((s) => s.verified);
  if (verified === null) {
    return (
      <DefaultLayout>
        <div className="flex justify-center py-20" role="status" aria-label="Indlæser">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </DefaultLayout>
    );
  }
  if (verified === false) {
    return (
      <DefaultLayout>
        <LockedUntilVerified title={title} />
      </DefaultLayout>
    );
  }
  return <>{children}</>;
}
