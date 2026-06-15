import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { SplitScreen } from "../../src/components/SplitScreen";
import { Button } from "../../src/components/ui/button";
import { supabase } from "../../src/lib/supabase";
import { useClientEffect } from "../../src/lib/ssr-utils";
import { translateAuthError } from "../../src/lib/auth-errors";

const RESEND_COOLDOWN_SECONDS = 30;

function ConfirmEmail() {
  const navigate = useNavigate();
  const { email } = useSearch({ from: "/confirmemail" });

  const [cooldown, setCooldown] = useState(0);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const [showFallback, setShowFallback] = useState(false);

  useClientEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.email_confirmed_at) {
        navigate({ to: "/home" });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // If confirmation hasn't happened after a while (e.g. user opened the link on
  // another device, so this tab's auth listener never fires), offer a way out.
  useClientEffect(() => {
    const timer = window.setTimeout(() => setShowFallback(true), 15000);
    return () => window.clearTimeout(timer);
  }, []);

  // Tick down the resend cooldown.
  useClientEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0 || resendState === "sending") return;
    setError("");
    setResendState("sending");
    try {
      const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
      if (resendError) throw resendError;
      setResendState("sent");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setResendState("idle");
      setError(err instanceof Error ? translateAuthError(err.message) : "Der opstod en fejl. Prøv igen.");
    }
  };

  return (
    <SplitScreen illustration="tennis" tagline="Vi sendte dig en bekræftelse — så er du klar.">
      <div className="text-center">
        <div className="inline-flex items-center justify-center">
          <div className="h-8 w-8">
            <MailCheck />
          </div>
        </div>
        <p className="mt-4 text-gray-600">
          Tjek din indbakke for at bekræfte din e-mailadresse{email ? ` (${email})` : ""}
        </p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6">
          {resendState === "sent" ? (
            <p className="text-sm text-green-700">Vi har sendt en ny bekræftelsesmail.</p>
          ) : (
            <p className="text-sm text-gray-500">Fik du ikke mailen? Tjek dit spamfilter, eller send den igen.</p>
          )}
          <Button
            type="button"
            variant="outline"
            className="mt-2"
            onClick={handleResend}
            disabled={!email || cooldown > 0 || resendState === "sending"}
          >
            {resendState === "sending"
              ? "Sender..."
              : cooldown > 0
                ? `Send igen om ${cooldown}s`
                : "Send bekræftelsesmail igen"}
          </Button>
        </div>

        {showFallback && (
          <p className="mt-6 text-sm text-gray-500">
            Har du allerede bekræftet på en anden enhed?{" "}
            <Link to="/login" className="text-blue-700 hover:text-blue-900 font-medium">
              Log ind her
            </Link>
          </p>
        )}
      </div>
    </SplitScreen>
  );
}

export const Route = createFileRoute("/confirmemail")({
  component: ConfirmEmail,
  validateSearch: (search: Record<string, unknown>) => ({
    email: (search.email as string) || "",
  }),
});
