import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SplitScreen } from "../components/SplitScreen";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { User, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setIsLoggedIn(!!data.session);
      } catch (error) {
        console.error("Error checking auth status:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  return (
    <SplitScreen>
      <div className="">
        <h1 className="text-2xl mb-6">
          Mød dine nye
          <br /> bedste venner
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Opret en profil og find nye venner med lignende hobbyer og passioner. Gør din hverdag sjovere og mere spændende ved at skabe
          forbindelser med ligesindede.
        </p>
        <div className="space-y-4">
          <Link
            to="/details"
            className="glow-button w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors bg-black text-white"
          >
            Start nu
            <ArrowRight size={20} />
          </Link>

          <p className="mt-6 text-center text-gray-600">
            Har du allerede en konto? <Link to="/login">Log ind her</Link>
          </p>
        </div>
      </div>
    </SplitScreen>
  );
}

// export const Route = createRoute({
//   getParentRoute: () => rootRoute,
//   path: '/',
//   beforeLoad: () => {
//     throw redirect({ to: '/welcome' });
//   },
// });
