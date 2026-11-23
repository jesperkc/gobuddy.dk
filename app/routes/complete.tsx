import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { DefaultLayout } from "../../src/components/AppShell";
import { useClientEffect } from "../../src/lib/ssr-utils";
import { supabase } from "../../src/lib/supabase";
import { track } from "../../src/lib/track";
import { useEmailVerificationStore } from "../../src/store/emailVerification";

function Complete() {
  const navigate = useNavigate();

  useClientEffect(() => {
    // The user lands here after clicking the link in a verification email.
    // getSession() waits for Supabase to exchange the token in the URL, then we
    // record that this email has been proven (the database checks the session
    // really came from an email link before accepting it).
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const { error } = await supabase.rpc("mark_email_verified");
        if (error) {
          console.error("mark_email_verified failed:", error);
          toast.error("Vi kunne ikke bekræfte din email. Prøv igen fra forsiden.");
        } else {
          useEmailVerificationStore.getState().setVerified(true);
          track("email_confirmed", { method: "link" });
          toast.success("Din email er bekræftet");
        }
      }

      if (!cancelled) navigate({ to: "/home" });
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <DefaultLayout>
      <div className="max-w-md mx-auto text-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          <p className="text-gray-600">Email bekræftet — sender dig videre...</p>
        </div>
      </div>
    </DefaultLayout>
  );
}

export const Route = createFileRoute("/complete")({
  component: Complete,
});
