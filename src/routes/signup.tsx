import { useNavigate } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { SplitScreen } from "../components/SplitScreen";
import { useOnboardingStore } from "../store/onboarding";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "@/components/ui/button";

export function Signup() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const {
    age,
    name,
    coordinates,
    interests,
    address,
    email,
    password,
    newsletter,
    setEmail,
    setPassword,
    setNewsletter,
  } = useOnboardingStore();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: name,
            age,
            coordinates: coordinates
              ? `POINT(${coordinates.lat} ${coordinates.lng})`
              : null,
            postcode: address.postcode,
            city: address.city,
            country: address.country,
            country_code: address.country_code,
            longitude: coordinates?.lng,
            latitude: coordinates?.lat,
            interests,
            newsletter,
          },
          emailRedirectTo: `${location.protocol}//${location.host}/complete`, // you will have to make the project part dynamic in whichever way the framework you are using allows you to do this.
        },
      });

      if (signUpError) throw signUpError;
      console.log("data", data);
      if (data.user) {
        navigate({ to: "/confirm-email" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SplitScreen>
      <div>
        <h1 className="text-2xl font-bold mb-6">Opret din konto</h1>
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}
        <form onSubmit={handleSignup} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Adgangskode
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              minLength={6}
            />
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="newsletter"
                type="checkbox"
                checked={newsletter}
                onChange={(e) => setNewsletter(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="newsletter" className="text-sm text-gray-600">
                Modtag vores nyhedsbrev
              </label>
            </div>
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            variant={"glow"}
            size={"xl"}
            className="w-full"
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
