import { createFileRoute } from "@tanstack/react-router";
import { PageTitle } from "@/components/PageTitle";
import { useNavigate } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { SplitScreen } from "../../src/components/SplitScreen";
import { useOnboardingStore } from "../../src/store/onboarding";
import { useMemo, useState } from "react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { supabase } from "../../src/lib/supabase";
import { Button } from "../../src/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { isBrowser, safeWindow } from "../../src/lib/ssr-utils";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { translateAuthError } from "../../src/lib/auth-errors";

export interface SignupRequestData {
  email: string;
  password: string;
  options: {
    data: SignupProfileData;
    emailRedirectTo: string;
  };
}

export interface SignupProfileData {
  first_name: string;
  age: number;
  bio?: string;
  coordinates: string | null;
  postcode: string;
  city: string;
  country: string;
  country_code: string;
  longitude?: number;
  latitude?: number;
  interests: string[];
  newsletter: boolean;
}

function Signup() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const { age, name, coordinates, interests, address, email, password, newsletter, setEmail, setPassword, setNewsletter, reset } =
    useOnboardingStore();

  const signupObject = useMemo<SignupRequestData>(() => {
    const obj = {
      email,
      password,
      options: {
        data: {
          first_name: name,
          age,
          coordinates: coordinates ? `POINT(${coordinates.lat} ${coordinates.lng})` : null,
          postcode: address.postcode,
          city: address.city,
          country: address.country,
          country_code: address.country_code,
          longitude: coordinates?.lng,
          latitude: coordinates?.lat,
          interests: interests.map((id) => ({ interest_id: id, description: "" })),
          newsletter,
        },
        emailRedirectTo:
          isBrowser && safeWindow?.location ? `${safeWindow.location.protocol}//${safeWindow.location.host}/complete` : "/complete", // fallback for SSR
      },
    };

    // Expose signupObject for testing purposes (dev/test builds only — never ship
    // the plaintext password to window in production).
    if (import.meta.env.DEV && isBrowser && safeWindow) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (safeWindow as any).__TEST_SIGNUP_OBJECT__ = obj;
    }

    return obj;
  }, [email, password, name, age, coordinates, address, interests, newsletter]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Adgangskoden skal være mindst 8 tegn");
      return;
    }

    if (password !== confirmPassword) {
      setError("Adgangskoderne matcher ikke");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp(signupObject);

      if (signUpError) throw signUpError;

      if (data.user) {
        reset();
        navigate({ to: "/confirmemail", search: { email } });
      }
    } catch (err) {
      setError(err instanceof Error ? translateAuthError(err.message) : "Der opstod en fejl. Prøv igen.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SplitScreen illustration="cyclist" tagline="Sidste skridt — opret din konto og kom afsted.">
      <div>
        <OnboardingStepper step={4} />
        <PageTitle className="text-3xl tracking-tight">Opret din konto</PageTitle>
        <ErrorBanner message={error} />
        <form onSubmit={handleSignup} className="space-y-6">
          <div>
            <Label htmlFor="email" className="block font-medium text-gray-700 mb-2">
              Email
            </Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password" className="block font-medium text-gray-700 mb-2">
              Adgangskode
            </Label>
            <Input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            {/* Password strength indicator */}
            {password.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => {
                    const strength = password.length >= 12 ? 4 : password.length >= 10 ? 3 : password.length >= 8 ? 2 : 1;
                    const colors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-500"];
                    return (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          level <= strength ? colors[strength - 1] : "bg-gray-200"
                        }`}
                      />
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {password.length < 8
                    ? "For kort — mindst 8 tegn"
                    : password.length < 10
                      ? "Svag — prøv mindst 10 tegn"
                      : password.length < 12
                        ? "God"
                        : "Stærk"}
                </p>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="block font-medium text-gray-700 mb-2">
              Bekræft adgangskode
            </Label>
            <Input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="newsletter"
              checked={newsletter}
              onCheckedChange={(checked) => setNewsletter(checked === true)}
            />
            <Label htmlFor="newsletter" className="text-gray-600 cursor-pointer select-none">
              Modtag vores nyhedsbrev
            </Label>
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            size="xl"
            className="w-full rounded-full bg-gray-900 hover:bg-gray-800 text-white shadow-lg"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Opretter konto...</span>
              </>
            ) : (
              <>
                <UserPlus size={20} />
                Opret konto
              </>
            )}
          </Button>
        </form>
      </div>
    </SplitScreen>
  );
}

export const Route = createFileRoute("/signup")({
  component: Signup,
});
