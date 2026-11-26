import { CalendarPlus, Hand, MapPin, MessageCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { InterestBadge } from "@/components/InterestBadge";
import { formatDistance } from "@/lib/geo";
import type { BuddyProfile } from "@/components/BuddyCard";

interface BestMatchCardProps {
  buddy: BuddyProfile;
  sharedInterestIds: Set<string>;
  distanceKm: number | null;
  hi5Sent: boolean;
  sending: boolean;
  onHi5: () => void;
  onChat: () => void;
  onPropose: () => void;
}

/** The single most relevant person for a new user, with a one-tap first action. */
export function BestMatchCard({ buddy, sharedInterestIds, distanceKm, hi5Sent, sending, onHi5, onChat, onPropose }: BestMatchCardProps) {
  const shared = buddy.interests.filter((i) => sharedInterestIds.has(i.interest_id));
  const name = buddy.first_name || "Anonym";
  const firstShared = shared[0]?.interest_da.toLowerCase();

  return (
    <section aria-labelledby="best-match-title" className="card-reveal rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        <Link
          to="/buddy/$slug"
          params={{ slug: buddy.slug }}
          className="flex items-center gap-4 no-underline text-inherit min-w-0 sm:flex-1"
        >
          <Avatar className="h-16 w-16 shrink-0 text-xl">
            {buddy.avatar_url && <AvatarImage src={buddy.avatar_url} alt="" />}
            <AvatarFallback className="bg-blue-100 text-blue-700">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-lg leading-tight">
              {name}
              {buddy.age && <span className="text-gray-500 text-sm font-normal ml-1.5">{buddy.age}</span>}
            </p>
            <p className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
              {[buddy.city, distanceKm !== null ? formatDistance(distanceKm) : null].filter(Boolean).join(" · ")}
            </p>
            {shared.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {shared.slice(0, 4).map((interest) => (
                  <InterestBadge key={interest.interest_id} name={interest.interest_da} icon={interest.icon} variant="shared" />
                ))}
              </div>
            )}
          </div>
        </Link>

        <div className="flex flex-col gap-2 sm:shrink-0">
          {hi5Sent ? (
            <>
              <Button variant="dark" onClick={onPropose} size="lg" className="w-full sm:w-auto">
                <CalendarPlus className="w-4 h-4" />
                Foreslå en tur
              </Button>
              <Button onClick={onChat} variant="outline" size="lg" className="w-full sm:w-auto">
                <MessageCircle className="w-4 h-4" />
                Åbn chat med {name}
              </Button>
            </>
          ) : (
            <>
              <div className="gap-2 flex">
                <Button variant="dark"
                  onClick={onHi5}
                  disabled={sending}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <Hand className="w-4 h-4 -rotate-12" />
                  {sending ? "Sender..." : `Send highfive til ${name}`}
                </Button>
                <Button onClick={onChat} variant="outline" size="lg" className="w-full sm:w-auto">
                  Skriv besked
                </Button>
              </div>
              <Button onClick={onPropose} variant="outline" size="lg" className="w-full sm:w-auto">
                <CalendarPlus className="w-4 h-4" />
                Foreslå en tur
              </Button>
            </>
          )}
        </div>
      </div>
      {!hi5Sent && firstShared && (
        <p className="text-xs text-gray-500 mt-4">Et highfive er nok — eller spring direkte til at foreslå {firstShared} en bestemt dag.</p>
      )}
    </section>
  );
}
