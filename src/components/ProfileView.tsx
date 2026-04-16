import { Link } from "@tanstack/react-router";
import { MapPin, Calendar, Mail, Pencil, Ban, ExternalLink, MessageCircle, Hand, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { ProfilePhotoDialog } from "./ProfilePhotoDialog";
import { ErrorBanner } from "./ErrorBanner";
import { InterestBadge } from "./InterestBadge";
import { ActivityPostCard } from "./ActivityPostCard";
import type { ActivityPost } from "@/store/activityPosts";

export interface ProfileViewInterest {
  interest_id: string;
  interest_da: string;
  icon: string;
  description?: string | null;
}

export interface ProfileViewData {
  profile_id: string;
  first_name: string | null;
  age: number | null;
  city: string | null;
  country: string | null;
  avatar_url: string | null;
  created_at: string | null;
  email?: string | null;
  interests: ProfileViewInterest[];
  nonInterests: ProfileViewInterest[];
}

export interface RelatedPair {
  myInterest: { interest_id: string; interest_da: string };
  buddyInterest: { interest_id: string; interest_da: string };
  score: number;
}

interface ProfileViewProps {
  data: ProfileViewData;
  isOwn: boolean;
  /** Ids of the viewer's own interests — used to highlight shared interests when viewing someone else. */
  myInterestIds?: Set<string>;
  relatedPairs?: RelatedPair[];
  stravaAthleteId?: number | null;
  activityPosts?: ActivityPost[];
  onDeletePost?: (id: string) => void | Promise<void>;
  onChat?: () => void;
  onWave?: () => void;
  waveSent?: boolean;
  sendingWave?: boolean;
  error?: string | null;
}

export function ProfileView({
  data,
  isOwn,
  myInterestIds,
  relatedPairs = [],
  stravaAthleteId,
  activityPosts = [],
  onDeletePost,
  onChat,
  onWave,
  waveSent = false,
  sendingWave = false,
  error,
}: ProfileViewProps) {
  const initials = data.first_name?.slice(0, 2).toUpperCase() || "?";
  const relatedBuddyInterestIds = new Set(relatedPairs.map((p) => p.buddyInterest.interest_id));

  const activityStats = (() => {
    const statsMap = new Map<string, { label: string; icon: string; count: number }>();
    for (const post of activityPosts) {
      if (!post.interest) continue;
      const key = post.interest.interest_id;
      const existing = statsMap.get(key) || { label: post.interest.interest_da, icon: post.interest.icon, count: 0 };
      existing.count++;
      statsMap.set(key, existing);
    }
    return Array.from(statsMap.values()).sort((a, b) => b.count - a.count);
  })();

  const interestsWithDescriptions = data.interests.filter((i) => i.description);

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />

      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <ProfilePhotoDialog avatarUrl={data.avatar_url} name={data.first_name} initials={initials} />
            <div>
              <h1 className="text-3xl">
                {data.first_name || (isOwn ? "Unavngivet" : "Anonym")}
                {data.age ? `, ${data.age}` : ""}
              </h1>
              {data.city && (
                <p className="text-gray-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {data.city}
                  {data.country ? `, ${data.country}` : ""}
                </p>
              )}
            </div>
          </div>

          {isOwn ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/profile-edit">
                <Pencil className="w-3.5 h-3.5" />
                Rediger
              </Link>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              {onChat && (
                <button
                  onClick={onChat}
                  className="h-12 w-12 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors flex items-center justify-center"
                  title={`Skriv til ${data.first_name || "denne buddy"}`}
                >
                  <MessageCircle className="w-6 h-6" />
                </button>
              )}
              {onWave &&
                (!waveSent ? (
                  <button
                    onClick={onWave}
                    disabled={sendingWave}
                    className="h-12 w-12 rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    <Hand className={`w-6 h-6 ${sendingWave ? "animate-bounce" : ""}`} />
                  </button>
                ) : (
                  <div className="h-12 w-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                    <Hand className="w-6 h-6" />
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Interests */}
        {data.interests.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Interesser</h2>
            <div className="flex flex-wrap gap-2">
              {data.interests.map((interest) => {
                const isShared = !isOwn && myInterestIds?.has(interest.interest_id);
                const isRelated = !isOwn && relatedBuddyInterestIds.has(interest.interest_id);
                return (
                  <InterestBadge
                    key={interest.interest_id}
                    name={interest.interest_da}
                    icon={interest.icon}
                    variant={isShared ? "shared" : isRelated ? "related" : "default"}
                    size="md"
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Interest detail cards (only those with descriptions) */}
        {interestsWithDescriptions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {interestsWithDescriptions.map((interest) => {
              const isShared = !isOwn && myInterestIds?.has(interest.interest_id);
              const isRelated = !isOwn && relatedBuddyInterestIds.has(interest.interest_id);
              return (
                <div
                  key={interest.interest_id}
                  className={`rounded-xl border p-4 ${
                    isShared
                      ? "bg-green-50 border-green-200"
                      : isRelated
                        ? "bg-violet-50 border-violet-200"
                        : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{interest.icon}</span>
                    <span className="font-medium text-gray-900">{interest.interest_da}</span>
                  </div>
                  <p className="text-sm text-gray-500">{interest.description}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Related interests */}
        {!isOwn && relatedPairs.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-violet-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Relaterede interesser
            </h2>
            <div className="space-y-2">
              {relatedPairs.map((pair) => (
                <div
                  key={`${pair.myInterest.interest_id}-${pair.buddyInterest.interest_id}`}
                  className="flex items-center gap-3 rounded-xl bg-violet-50 border border-violet-100 px-4 py-3"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-base font-medium text-violet-800">Du: {pair.myInterest.interest_da}</span>
                    <span className="text-violet-400">→</span>
                    <span className="text-base font-medium text-violet-800">
                      {data.first_name || "De"}: {pair.buddyInterest.interest_da}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="w-16 h-1.5 rounded-full bg-violet-200 overflow-hidden">
                      <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.round(pair.score * 100)}%` }} />
                    </div>
                    <span className="text-xs text-violet-500 font-medium w-8 text-right">{Math.round(pair.score * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Non-interests */}
        {data.nonInterests.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-red-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Ban className="w-4 h-4" />
              Ikke-interesser
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.nonInterests.map((interest) => (
                <InterestBadge
                  key={interest.interest_id}
                  name={interest.interest_da}
                  icon={<Ban className="w-3.5 h-3.5" />}
                  variant="red"
                  size="md"
                />
              ))}
            </div>
          </div>
        )}

        {/* Activity stats */}
        {activityStats.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Aktivitetsstatistik</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {activityStats.map((s) => (
                <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{s.count}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity posts */}
        {activityPosts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Seneste aktiviteter</h2>
              {isOwn && (
                <Link to="/feed" className="text-xs text-blue-700 hover:underline">
                  Se alle i feed →
                </Link>
              )}
            </div>
            <div className="space-y-3">
              {activityPosts.slice(0, isOwn ? 5 : 10).map((post, i) => (
                <ActivityPostCard
                  key={post.id}
                  post={post}
                  showAuthor={false}
                  onDelete={isOwn ? onDeletePost : undefined}
                  index={i}
                />
              ))}
            </div>
          </div>
        )}

        {/* Strava */}
        {stravaAthleteId != null && (
          <div className="border-t pt-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Tilslutninger</h2>
            <a
              href={`https://www.strava.com/athletes/${stravaAthleteId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FC4C02]/10 text-[#FC4C02] hover:bg-[#FC4C02]/20 transition-colors text-sm font-medium"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
              Strava
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Details */}
        <div className="border-t pt-6 space-y-3">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Detaljer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isOwn && <DetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={data.email} />}
            <DetailRow
              icon={<Calendar className="w-4 h-4" />}
              label="Medlem siden"
              value={
                data.created_at
                  ? new Date(data.created_at).toLocaleDateString("da-DK", {
                      month: "long",
                      year: "numeric",
                    })
                  : undefined
              }
            />
          </div>
        </div>

        {/* Highfive confirmation */}
        {!isOwn && waveSent && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center text-base text-green-700">
            👋 Highfive sendt! De kan se din besked i chatten.
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-2 text-base">
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-500">{label}:</span>
      <span className="text-gray-900">{value || "Ikke angivet"}</span>
    </div>
  );
}
