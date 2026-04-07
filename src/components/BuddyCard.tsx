import { MapPin, Users, Sparkles, Hand } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistance } from "@/lib/geo";

export interface BuddyProfile {
  profile_id: string;
  slug: string;
  first_name: string | null;
  age: number | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at?: string | null;
  interests: {
    interest_id: string;
    interest_da: string;
    icon: string;
    category?: string | null;
  }[];
}

export interface RawBuddyRow {
  profile_id: string;
  slug: string;
  first_name: string | null;
  age: number | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at?: string | null;
  user_interests: Array<{
    interest_id: string;
    is_non_interest: boolean;
    interests: {
      interest_da: string;
      interest_en: string;
      icon: string;
      category: string | null;
    } | null;
  }>;
}

export function mapBuddyRow(row: RawBuddyRow): BuddyProfile {
  return {
    profile_id: row.profile_id,
    slug: row.slug,
    first_name: row.first_name,
    age: row.age,
    city: row.city,
    latitude: row.latitude,
    longitude: row.longitude,
    created_at: row.created_at,
    interests: (row.user_interests || [])
      .filter((ui) => ui.interests && !ui.is_non_interest)
      .map((ui) => ({
        interest_id: ui.interest_id,
        interest_da: ui.interests!.interest_da,
        icon: ui.interests!.icon,
        category: ui.interests!.category,
      })),
  };
}

export interface RelatedInterestInfo {
  interest_id: string;
  interest_da: string;
  icon: string;
}

interface BuddyCardProps {
  buddy: BuddyProfile;
  sharedInterestIds: Set<string>;
  relatedInterests?: RelatedInterestInfo[];
  distanceKm: number | null;
  hi5Sent?: boolean;
  index?: number;
}

export function BuddyCard({ buddy, sharedInterestIds, relatedInterests = [], distanceKm, hi5Sent, index = 0 }: BuddyCardProps) {
  const initials = buddy.first_name
    ? buddy.first_name.slice(0, 2).toUpperCase()
    : "?";

  const sharedInterests = buddy.interests.filter((i) =>
    sharedInterestIds.has(i.interest_id)
  );
  const relatedIds = new Set(relatedInterests.map((r) => r.interest_id));
  const otherInterests = buddy.interests.filter(
    (i) => !sharedInterestIds.has(i.interest_id) && !relatedIds.has(i.interest_id)
  );

  const sharedCount = sharedInterests.length;
  const relatedCount = relatedInterests.length;

  return (
    <Link
      to="/buddy/$slug"
      params={{ slug: buddy.slug }}
      className="card-reveal flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 no-underline text-inherit"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Avatar */}
      <div className="relative mb-3">
        <Avatar className="h-16 w-16 text-xl">
          <AvatarFallback className="bg-blue-100 text-blue-700">
            {initials}
          </AvatarFallback>
        </Avatar>
        {hi5Sent && (
          <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center ring-2 ring-white">
            <Hand className="w-3 h-3 -rotate-12" />
          </div>
        )}
      </div>

      {/* Name + age */}
      <h3 className="font-semibold text-base leading-tight text-center">
        {buddy.first_name || "Anonym"}
        {buddy.age && (
          <span className="text-gray-500 text-sm font-normal ml-1">{buddy.age}</span>
        )}
      </h3>

      {/* Location + distance */}
      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
        {buddy.city && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {buddy.city}
          </span>
        )}
        {distanceKm !== null && (
          <span>{formatDistance(distanceKm)}</span>
        )}
      </div>

      {/* Shared interests */}
      {(sharedCount > 0 || relatedCount > 0) && (
        <div className="mt-3 w-full">
          <p className="text-xs text-gray-500 mb-1.5 flex items-center justify-center gap-1">
            <Users className="w-3 h-3" />
            {sharedCount} fælles
            {relatedCount > 0 && (
              <span className="ml-1">· {relatedCount} relaterede</span>
            )}
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {sharedInterests.map((interest) => (
              <span
                key={interest.interest_id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium ring-1 ring-blue-100"
              >
                <span>{interest.icon}</span>
                {interest.interest_da}
              </span>
            ))}
            {relatedInterests.map((interest) => (
              <span
                key={interest.interest_id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs font-medium ring-1 ring-violet-100"
              >
                <Sparkles className="w-3 h-3" />
                {interest.interest_da}
              </span>
            ))}
            {otherInterests.map((interest) => (
              <span
                key={interest.interest_id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-600 rounded-full text-xs font-medium ring-1 ring-gray-100"
              >
                <span>{interest.icon}</span>
                {interest.interest_da}
              </span>
            ))}
          </div>
        </div>
      )}
    </Link>
  );
}
