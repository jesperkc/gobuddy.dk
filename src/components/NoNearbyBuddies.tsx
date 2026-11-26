import { Link } from "@tanstack/react-router";
import { Calendar, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDistance } from "@/lib/geo";
import { track } from "@/lib/track";

interface NoNearbyBuddiesProps {
  radiusKm: number;
  /** Distance to the closest person who shares an interest, if anyone does. */
  nearestKm: number | null;
}

export function NoNearbyBuddies({ radiusKm, nearestKm }: NoNearbyBuddiesProps) {
  const handleInvite = async () => {
    const url = window.location.origin;
    const text = "Jeg er på GoBuddy — find nogen at lave dine hobbyer sammen med.";
    track("invite_clicked");
    try {
      if (navigator.share) {
        await navigator.share({ title: "GoBuddy", text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast.success("Link kopieret");
      }
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  };

  return (
    <section className="rounded-2xl bg-gray-50 p-5 sm:p-6">
      <h2 className="text-base font-medium mb-1">Der er ingen med dine interesser inden for {radiusKm} km — endnu</h2>
      <p className="text-sm text-gray-600 mb-4">
        {nearestKm !== null
          ? `Den nærmeste er ${formatDistance(nearestKm)} væk. `
          : "Vi er stadig ved at vokse. "}
        Du får det meste ud af GoBuddy, når du tager en ven med.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="dark" onClick={handleInvite} size="lg">
          <Share2 className="w-4 h-4" />
          Inviter en ven
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link to="/activities">
            <Calendar className="w-4 h-4" />
            Se aktiviteter
          </Link>
        </Button>
        {nearestKm !== null && (
          <Button asChild variant="ghost" size="lg">
            <Link to="/buddies">Se alle buddies</Link>
          </Button>
        )}
      </div>
    </section>
  );
}
