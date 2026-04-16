import { Link } from "@tanstack/react-router";
import {
  MapPin,
  Calendar,
  Mail,
  Pencil,
  Ban,
  ExternalLink,
  MessageCircle,
  Hand,
  Sparkles,
  Activity,
  Heart,
} from "lucide-react";
import { Button } from "./ui/button";
import { ProfilePhotoDialog } from "./ProfilePhotoDialog";
import { ErrorBanner } from "./ErrorBanner";
import { InterestBadge } from "./InterestBadge";
import { ActivityPostCard } from "./ActivityPostCard";
import { InterestIcon } from "./InterestIcon";
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
  const memberSince = data.created_at
    ? new Date(data.created_at).toLocaleDateString("da-DK", { month: "long", year: "numeric" })
    : null;

  const hasMainContent =
    interestsWithDescriptions.length > 0 ||
    (!isOwn && relatedPairs.length > 0) ||
    activityPosts.length > 0;

  const hasSidebar =
    activityStats.length > 0 ||
    data.nonInterests.length > 0 ||
    stravaAthleteId != null ||
    isOwn ||
    memberSince;

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />

      {/* Hero */}
      <section className="card-reveal rounded-3xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="shrink-0">
            <div className="rounded-full ring-4 ring-gray-50 p-1 bg-white">
              <ProfilePhotoDialog
                avatarUrl={data.avatar_url}
                name={data.first_name}
                initials={initials}
                avatarClassName="h-24 w-24 sm:h-28 sm:w-28 text-3xl"
              />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h1
              className="text-4xl sm:text-5xl leading-tight tracking-tight"
              style={{ textWrap: "balance" }}
            >
              {data.first_name || (isOwn ? "Unavngivet" : "Anonym")}
              {data.age ? (
                <span className="text-gray-400 font-normal tabular-nums">, {data.age}</span>
              ) : null}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-500">
              {data.city && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {data.city}
                  {data.country ? `, ${data.country}` : ""}
                </span>
              )}
              {memberSince && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Medlem siden {memberSince}
                </span>
              )}
            </div>

            {/* Quick stats */}
            <div className="mt-4 flex flex-wrap gap-2">
              {activityPosts.length > 0 && (
                <StatPill
                  icon={<Activity className="w-3.5 h-3.5" />}
                  value={activityPosts.length}
                  label={activityPosts.length === 1 ? "aktivitet" : "aktiviteter"}
                />
              )}
              {!isOwn && relatedPairs.length > 0 && (
                <StatPill
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                  value={relatedPairs.length}
                  label="relaterede"
                  tone="violet"
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="shrink-0 flex flex-row sm:flex-col gap-2 sm:items-end">
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
                    className="h-11 w-11 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 active:scale-[0.96] transition-[background-color,transform] flex items-center justify-center"
                    title={`Skriv til ${data.first_name || "denne buddy"}`}
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                )}
                {onWave &&
                  (!waveSent ? (
                    <button
                      onClick={onWave}
                      disabled={sendingWave}
                      className="h-11 w-11 rounded-full bg-green-100 text-green-700 hover:bg-green-200 active:scale-[0.96] transition-[background-color,transform] flex items-center justify-center disabled:opacity-50"
                      title="Send highfive"
                    >
                      <Hand className={`w-5 h-5 ${sendingWave ? "animate-bounce" : ""}`} />
                    </button>
                  ) : (
                    <div
                      className="h-11 w-11 rounded-full bg-green-100 text-green-700 flex items-center justify-center"
                      title="Highfive sendt"
                    >
                      <Hand className="w-5 h-5" />
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Interest badges — full-width row inside hero */}
        {data.interests.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap gap-2">
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
        )}

        {/* Highfive confirmation inside hero */}
        {!isOwn && waveSent && (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            👋 Highfive sendt! De kan se din besked i chatten.
          </div>
        )}
      </section>

      {/* Main + sidebar */}
      <div className={`grid gap-6 ${hasMainContent && hasSidebar ? "lg:grid-cols-3" : ""}`}>
        {/* Main column */}
        {hasMainContent && (
          <div className={`space-y-6 ${hasSidebar ? "lg:col-span-2" : ""}`}>
            {/* Interest descriptions */}
            {interestsWithDescriptions.length > 0 && (
              <Card title="Om interesserne" icon={<Heart className="w-4 h-4" />} delay={60}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {interestsWithDescriptions.map((interest) => {
                    const isShared = !isOwn && myInterestIds?.has(interest.interest_id);
                    const isRelated = !isOwn && relatedBuddyInterestIds.has(interest.interest_id);
                    return (
                      <div
                        key={interest.interest_id}
                        className={`rounded-xl border p-4 transition-colors ${
                          isShared
                            ? "bg-green-50 border-green-200"
                            : isRelated
                              ? "bg-violet-50 border-violet-200"
                              : "bg-gray-50/60 border-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <InterestIcon icon={interest.icon} size={20} />
                          <span className="font-medium text-gray-900">{interest.interest_da}</span>
                        </div>
                        <p className="text-sm text-gray-500" style={{ textWrap: "pretty" }}>
                          {interest.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Related interests */}
            {!isOwn && relatedPairs.length > 0 && (
              <Card
                title="Relaterede interesser"
                icon={<Sparkles className="w-4 h-4" />}
                tone="violet"
                delay={120}
              >
                <div className="space-y-2">
                  {relatedPairs.map((pair) => (
                    <div
                      key={`${pair.myInterest.interest_id}-${pair.buddyInterest.interest_id}`}
                      className="flex items-center gap-3 rounded-xl bg-violet-50/60 border border-violet-100 px-4 py-3"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                        <span className="text-sm font-medium text-violet-800">
                          Du: {pair.myInterest.interest_da}
                        </span>
                        <span className="text-violet-400">→</span>
                        <span className="text-sm font-medium text-violet-800">
                          {data.first_name || "De"}: {pair.buddyInterest.interest_da}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-16 h-1.5 rounded-full bg-violet-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-violet-500"
                            style={{ width: `${Math.round(pair.score * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-violet-500 font-medium w-9 text-right tabular-nums">
                          {Math.round(pair.score * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Activity posts */}
            {activityPosts.length > 0 && (
              <Card
                title="Seneste aktiviteter"
                icon={<Activity className="w-4 h-4" />}
                delay={180}
                action={
                  isOwn ? (
                    <Link to="/feed" className="text-xs text-blue-700 hover:underline">
                      Se alle i feed →
                    </Link>
                  ) : null
                }
              >
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
              </Card>
            )}
          </div>
        )}

        {/* Sidebar */}
        {hasSidebar && (
          <aside className="space-y-6">
            {/* Activity stats */}
            {activityStats.length > 0 && (
              <Card title="Aktivitetsstatistik" icon={<Activity className="w-4 h-4" />} delay={80}>
                <div className="grid grid-cols-2 gap-2">
                  {activityStats.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl bg-gray-50/60 border border-gray-100 p-3 text-center"
                    >
                      <div className="flex items-center justify-center gap-1.5 mb-0.5">
                        <InterestIcon icon={s.icon} size={16} className="text-gray-500" />
                        <p className="text-xl font-semibold tabular-nums">{s.count}</p>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{s.label}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Non-interests */}
            {data.nonInterests.length > 0 && (
              <Card title="Ikke-interesser" icon={<Ban className="w-4 h-4" />} tone="red" delay={140}>
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
              </Card>
            )}

            {/* Strava */}
            {stravaAthleteId != null && (
              <Card title="Tilslutninger" delay={200}>
                <a
                  href={`https://www.strava.com/athletes/${stravaAthleteId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FC4C02]/10 text-[#FC4C02] hover:bg-[#FC4C02]/20 active:scale-[0.96] transition-[background-color,transform] text-sm font-medium"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                  </svg>
                  Strava
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </Card>
            )}

            {/* Details (own only — email) */}
            {isOwn && data.email && (
              <Card title="Detaljer" delay={260}>
                <div className="flex items-center gap-2 text-sm min-w-0">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-gray-500 shrink-0">Email:</span>
                  <span className="text-gray-900 truncate">{data.email}</span>
                </div>
              </Card>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

/* ————————————————————————————————————————————————— */

type Tone = "default" | "violet" | "red";

function Card({
  title,
  icon,
  tone = "default",
  delay = 0,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  tone?: Tone;
  delay?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const titleColor =
    tone === "violet" ? "text-violet-600" : tone === "red" ? "text-red-500" : "text-gray-500";

  return (
    <section
      className="card-reveal rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2
          className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${titleColor}`}
        >
          {icon}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatPill({
  icon,
  value,
  label,
  tone = "default",
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  tone?: "default" | "violet";
}) {
  const colors =
    tone === "violet"
      ? "bg-violet-50 text-violet-700 border-violet-100"
      : "bg-gray-50 text-gray-700 border-gray-100";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${colors}`}
    >
      <span className="text-gray-400">{icon}</span>
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="text-gray-500">{label}</span>
    </span>
  );
}
