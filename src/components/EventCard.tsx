import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, Users } from "lucide-react";
import { type EventWithDetails, formatEventDate } from "@/store/events";
import { formatDistance } from "@/lib/geo";
import { InterestBadge } from "@/components/InterestBadge";

interface EventCardProps {
  event: EventWithDetails;
  distanceKm: number | null;
  index?: number;
}

export function EventCard({ event, distanceKm, index = 0 }: EventCardProps) {
  const participantCount = event.event_participants.length;
  const interests = event.event_interests.map((ei) => ei.interests);

  return (
    <Link
      to="/activities/$slug"
      params={{ slug: event.slug }}
      className="card-reveal block rounded-2xl border border-gray-100 bg-white p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 no-underline text-inherit"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.title}</h3>

      <div className="flex flex-col gap-1.5 text-sm text-gray-500 mb-3">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 shrink-0" />
          <span className="capitalize">{formatEventDate(event)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4 shrink-0" />
          {event.place_name.split(",")[0].trim()}
          {distanceKm != null && (
            <span className="text-gray-400">· {formatDistance(distanceKm)}</span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4 shrink-0" />
          {participantCount} deltager{participantCount !== 1 ? "e" : ""}
          {event.max_participants && ` / ${event.max_participants}`}
        </span>
      </div>

      {interests.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {interests.map((interest) => (
            <InterestBadge
              key={interest.interest_id}
              name={interest.interest_da}
              icon={interest.icon}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        Oprettet af {event.creator.first_name ?? "Ukendt"}
      </p>
    </Link>
  );
}
