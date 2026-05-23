import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { SplitScreen } from "../../src/components/SplitScreen";
import { supabase } from "../../src/lib/supabase";
import { useClientEffect } from "../../src/lib/ssr-utils";

function ConfirmEmail() {
  const navigate = useNavigate();
  const { email } = useSearch({ from: "/confirmemail" });

  useClientEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AuthContext onAuthStateChange", event, session);
      if (session?.user?.email_confirmed_at) {
        navigate({ to: "/home" });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <SplitScreen illustration="tennis" tagline="Vi sendte dig en bekræftelse — så er du klar.">
      <div className="text-center">
        <div className="inline-flex items-center justify-center">
          <div className="h-8 w-8">
            <MailCheck />
          </div>
        </div>
        <p className="mt-4 text-gray-600">Tjek din indbakke for at bekræfte din e-mailadresse{email ? ` (${email})` : ""}</p>
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
