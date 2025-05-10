import { useNavigate } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { SplitScreen } from "../components/SplitScreen";
import { useOnboardingStore } from "../store/onboarding";
import { supabase } from "../lib/supabase";
import { useEffect } from "react";

export function ConfirmEmail() {
  const navigate = useNavigate();
  const { email } = useOnboardingStore();

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AuthContext onAuthStateChange", event, session);
      if (session?.user?.email_confirmed_at) {
        navigate({ to: "/completed" });
      }
    });
  }, []);

  return (
    <SplitScreen>
      <div className="text-center">
        <div className="inline-flex items-center justify-center">
          <div className="h-8 w-8">
            <MailCheck />
          </div>
        </div>
        <p className="mt-4 text-gray-600">
          Check your inbox to confirm your email address ({email})
        </p>
      </div>
    </SplitScreen>
  );
}
