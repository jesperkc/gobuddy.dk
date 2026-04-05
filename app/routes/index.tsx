import { createFileRoute, Link } from "@tanstack/react-router";
import { SplitScreen } from "../../src/components/SplitScreen";
import { ArrowRight } from "lucide-react";
import { UnauthedRoute } from "@/components/UnauthedRoute";

function Index() {
  return (
    <SplitScreen>
      <div className="">
        <h1 className="text-3xl sm:text-4xl mb-6 leading-tight">
          Mød dine nye
          <br /> bedste venner
        </h1>
        <p className="text-lg text-gray-500 mb-8 leading-relaxed">
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

function UnauthedIndex() {
  return (
    <UnauthedRoute>
      <Index />
    </UnauthedRoute>
  );
}

export const Route = createFileRoute("/")({
  component: UnauthedIndex,
});
