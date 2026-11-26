import { createFileRoute, Link } from "@tanstack/react-router";
import { PageTitle } from "@/components/PageTitle";
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, UserPlus } from "lucide-react";
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
import { MAX_AGE, MIN_AGE } from "@/lib/age";
import { track } from "@/lib/track";
import { useClientEffect } from "../../src/lib/ssr-utils";

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
  const [showPassword, setShowPassword] = useState(false);
  const { age, name, coordinates, interests, address, email, password, newsletter, setName, setAge, setEmail, setPassword, setNewsletter, reset } =
    useOnboardingStore();

  useClientEffect(() => {
    track("signup_viewed");
  }, []);

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

    if (!age || age < MIN_AGE) {
      setError(`Du skal være mindst ${MIN_AGE} år for at bruge GoBuddy`);
      return;
    }

    if (age > MAX_AGE) {
      setError("Indtast en gyldig alder");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp(signupObject);

      if (signUpError) throw signUpError;

      if (data.user) {
        track("signup_submitted");
        reset();
        // With "Confirm email" off in Supabase a session is issued right away and
        // the user lands in the app (verification is requested later). With it on,
        // there is no session yet, so fall back to the confirm-your-email page.
        if (data.session) {
          navigate({ to: "/home" });
        } else {
          navigate({ to: "/confirmemail", search: { email } });
        }
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
        <OnboardingStepper step={3} />
        <PageTitle className="text-3xl tracking-tight">Opret din konto</PageTitle>
        <ErrorBanner message={error} />
        <form onSubmit={handleSignup} className="space-y-6">
          <div className="grid grid-cols-[1fr_6rem] gap-4">
            <div>
              <Label htmlFor="name" className="block font-medium text-gray-700 mb-2">
                Fornavn
              </Label>
              <Input
                type="text"
                id="name"
                autoComplete="given-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="age" className="block font-medium text-gray-700 mb-2">
                Alder
              </Label>
              <Input
                type="number"
                id="age"
                inputMode="numeric"
                min={MIN_AGE}
                max={MAX_AGE}
                value={age || ""}
                onChange={(e) => setAge(e.target.value === "" ? 0 : Number(e.target.value))}
                required
              />
            </div>
          </div>
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
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                id="password"
                autoComplete="new-password"
                className="pr-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Skjul adgangskode" : "Vis adgangskode"}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
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
          <Button variant="dark"
            type="submit"
            disabled={isLoading}
            size="xl"
            className="w-full shadow-lg"
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
          <p className="text-center text-xs text-gray-500 leading-relaxed">
            Se hvordan vi behandler dine oplysninger i vores{" "}
            <Link to="/privatlivspolitik" target="_blank" className="underline underline-offset-4 hover:text-gray-900">
              privatlivspolitik
            </Link>
            .
          </p>
        </form>
      </div>
    </SplitScreen>
  );
}

export const Route = createFileRoute("/signup")({
  component: Signup,
});
