import { Link } from "@tanstack/react-router";
import {
  MapPin,
  Calendar,
  Mail,
  Pencil,
  ExternalLink,
  MessageCircle,
  Hand,
  Sparkles,
  Activity,
  Heart,
  MinusCircle,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { Button } from "./ui/button";
import { ProfilePhotoDialog } from "./ProfilePhotoDialog";
import { ErrorBanner } from "./ErrorBanner";
import { InterestBadge } from "./InterestBadge";
import { ActivityPostCard } from "./ActivityPostCard";
import { InterestIcon } from "./InterestIcon";
import type { ActivityPost } from "@/store/activityPosts";
import { FollowingCard } from "./FollowingCard";

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

/* ————————————————————————————————————————————————— */
/* ProfileHero — the top section of a profile        */
/* ————————————————————————————————————————————————— */

interface ProfileHeroProps {
  data: ProfileViewData;
  isOwn: boolean;
  myInterestIds?: Set<string>;
  relatedPairs?: RelatedPair[];
  activityPosts?: ActivityPost[];
  onChat?: () => void;
  onWave?: () => void;
  waveSent?: boolean;
  sendingWave?: boolean;
  onFollow?: () => void;
  isFollowing?: boolean;
  followLoading?: boolean;
  /** Render without card wrapper (for use inside page header) */
  flat?: boolean;
}

export function ProfileHeroSkeleton() {
  return (
    <div className="relative overflow-hidden">
      <div aria-hidden className="absolute inset-x-0 top-0 h-28 sm:h-32" />
      <div className="relative pt-8 sm:pt-10 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-7">
          <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-full bg-gray-200 ring-4 ring-white" />
          <div className="flex-1 space-y-3">
            <div className="h-10 bg-gray-200 rounded w-56" />
            <div className="h-4 bg-gray-100 rounded w-40" />
          </div>
        </div>
        <div className="mt-6 pt-5 border-t border-gray-100 flex gap-8">
          <div className="space-y-2">
            <div className="h-6 w-8 bg-gray-200 rounded" />
            <div className="h-3 w-16 bg-gray-100 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-6 w-8 bg-gray-200 rounded" />
            <div className="h-3 w-16 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 bg-gray-100 rounded-full w-24" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProfileHero({
  data,
  isOwn,
  myInterestIds,
  relatedPairs = [],
  activityPosts = [],
  onChat,
  onWave,
  waveSent = false,
  sendingWave = false,
  onFollow,
  isFollowing = false,
  followLoading = false,
  flat = false,
}: ProfileHeroProps) {
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

  const memberSince = data.created_at ? new Date(data.created_at).toLocaleDateString("da-DK", { month: "long", year: "numeric" }) : null;

  const totalActivities = activityPosts.length;
  const topActivityKinds = activityStats.length;

  const wrapperClass = flat
    ? "relative overflow-hidden"
    : "card-reveal relative overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm";
  const contentClass = flat ? "relative pt-8 sm:pt-10" : "relative p-6 sm:p-8 pt-8 sm:pt-10";

  return (
    <section className={wrapperClass}>
      {/* Decorative cover band */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-28 sm:h-32" />

      <div className={contentClass}>
        <div className="flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-7">
          <div className="shrink-0">
            <div className="rounded-full ring-4 ring-white bg-white shadow-sm">
              <ProfilePhotoDialog
                avatarUrl={data.avatar_url}
                name={data.first_name}
                initials={initials}
                avatarClassName="h-28 w-28 sm:h-36 sm:w-36 text-4xl"
              />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-4xl sm:text-5xl leading-tight tracking-tight" style={{ textWrap: "balance" }}>
              {data.first_name || (isOwn ? "Unavngivet" : "Anonym")}
              {data.age ? <span className="text-gray-400 font-normal tabular-nums">, {data.age}</span> : null}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-600">
              {data.city && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  {data.city}
                  {data.country ? `, ${data.country}` : ""}
                </span>
              )}
              {memberSince && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  Medlem siden {memberSince}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="shrink-0 flex flex-row gap-2 sm:self-end">
            {isOwn ? (
              <Button asChild variant="default" size="sm">
                <Link to="/profile-edit">
                  <Pencil className="w-3.5 h-3.5" />
                  Rediger profil
                </Link>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                {onChat && (
                  <Button
                    onClick={onChat}
                    size="default"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    title={`Skriv til ${data.first_name || "denne buddy"}`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Skriv</span>
                  </Button>
                )}
                {onFollow && (
                  <Button
                    onClick={onFollow}
                    disabled={followLoading}
                    size="default"
                    variant="outline"
                    className={
                      isFollowing
                        ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50"
                    }
                    title={isFollowing ? "Stop med at følge" : `Følg ${data.first_name || "denne buddy"}`}
                  >
                    {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    <span className="hidden sm:inline">{isFollowing ? "Følger" : "Følg"}</span>
                  </Button>
                )}
                {onWave &&
                  (!waveSent ? (
                    <Button
                      onClick={onWave}
                      disabled={sendingWave}
                      size="default"
                      variant="outline"
                      className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                      title="Send highfive"
                    >
                      <Hand className={`w-4 h-4 ${sendingWave ? "animate-bounce" : ""}`} />
                      <span className="hidden sm:inline">Highfive</span>
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 h-9 text-green-700 text-sm font-medium">
                      <Hand className="w-4 h-4" />
                      <span className="hidden sm:inline">Sendt</span>
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Stat strip */}
        {(totalActivities > 0 || data.interests.length > 0 || (!isOwn && relatedPairs.length > 0)) && (
          <div className="mt-6 grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-x-8 gap-y-3 border-t border-gray-100 pt-5">
            {data.interests.length > 0 && <Stat value={data.interests.length} label="interesser" />}
            {totalActivities > 0 && (
              <Stat
                value={totalActivities}
                label={totalActivities === 1 ? "aktivitet" : "aktiviteter"}
                hint={topActivityKinds > 1 ? `på tværs af ${topActivityKinds} typer` : undefined}
              />
            )}
            {!isOwn && relatedPairs.length > 0 && (
              <Stat value={relatedPairs.length} label={relatedPairs.length === 1 ? "fælles tråd" : "fælles tråde"} tone="violet" />
            )}
          </div>
        )}

        {/* Interest badges */}
        {data.interests.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {[...data.interests]
              .sort((a, b) => {
                const aShared = !isOwn && myInterestIds?.has(a.interest_id) ? 2 : 0;
                const bShared = !isOwn && myInterestIds?.has(b.interest_id) ? 2 : 0;
                const aRelated = !isOwn && relatedBuddyInterestIds.has(a.interest_id) ? 1 : 0;
                const bRelated = !isOwn && relatedBuddyInterestIds.has(b.interest_id) ? 1 : 0;
                return bShared + bRelated - (aShared + aRelated);
              })
              .map((interest) => {
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

        {/* Highfive confirmation */}
        {!isOwn && waveSent && (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            👋 Highfive sendt! De kan se din besked i chatten.
          </div>
        )}
      </div>
    </section>
  );
}

/* ————————————————————————————————————————————————— */
/* ProfileView — full profile layout                 */
/* ————————————————————————————————————————————————— */

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
  onFollow?: () => void;
  isFollowing?: boolean;
  followLoading?: boolean;
  error?: string | null;
  hideHero?: boolean;
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
  onFollow,
  isFollowing = false,
  followLoading = false,
  error = "",
  hideHero = false,
}: ProfileViewProps) {
  const relatedBuddyInterestIds = new Set(relatedPairs.map((p) => p.buddyInterest.interest_id));

  const interestsWithDescriptions = data.interests.filter((i) => i.description);

  const hasMainContent = interestsWithDescriptions.length > 0 || (!isOwn && relatedPairs.length > 0) || activityPosts.length > 0;

  const hasSidebar = data.nonInterests.length > 0 || stravaAthleteId != null || (isOwn && !!data.email) || isOwn;

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />

      {!hideHero && (
        <ProfileHero
          data={data}
          isOwn={isOwn}
          myInterestIds={myInterestIds}
          relatedPairs={relatedPairs}
          activityPosts={activityPosts}
          onChat={onChat}
          onWave={onWave}
          waveSent={waveSent}
          sendingWave={sendingWave}
          onFollow={onFollow}
          isFollowing={isFollowing}
          followLoading={followLoading}
        />
      )}

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
                        className={`rounded-xl border p-4 transition-colors flex gap-3 ${
                          isShared
                            ? "bg-green-50 border-green-200"
                            : isRelated
                              ? "bg-violet-50 border-violet-200"
                              : "bg-gray-50/60 border-gray-100"
                        }`}
                      >
                        <div
                          className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                            isShared ? "bg-white/80 text-green-700" : isRelated ? "bg-white/80 text-violet-700" : "bg-white text-gray-700"
                          }`}
                        >
                          <InterestIcon icon={interest.icon} size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{interest.interest_da}</p>
                          <p className="text-sm text-gray-600 mt-0.5" style={{ textWrap: "pretty" }}>
                            {interest.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Related interests */}
            {!isOwn && relatedPairs.length > 0 && (
              <Card title="Relaterede interesser" icon={<Sparkles className="w-4 h-4" />} tone="violet" delay={120}>
                <div className="space-y-2">
                  {relatedPairs.map((pair) => (
                    <div
                      key={`${pair.myInterest.interest_id}-${pair.buddyInterest.interest_id}`}
                      className="flex items-center gap-3 rounded-xl bg-violet-50/60 border border-violet-100 px-4 py-3"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                        <span className="text-sm font-medium text-violet-800">Du: {pair.myInterest.interest_da}</span>
                        <span className="text-violet-400">→</span>
                        <span className="text-sm font-medium text-violet-800">
                          {data.first_name || "De"}: {pair.buddyInterest.interest_da}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 w-28">
                        <div className="flex-1 h-1.5 rounded-full bg-violet-200 overflow-hidden">
                          <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.round(pair.score * 100)}%` }} />
                        </div>
                        <span className="text-xs text-violet-600 font-medium w-9 text-right tabular-nums">
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
                    <ActivityPostCard key={post.id} post={post} showAuthor={false} onDelete={isOwn ? onDeletePost : undefined} index={i} />
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Sidebar */}
        {hasSidebar && (
          <aside className="space-y-6">
            {/* Non-interests */}
            {data.nonInterests.length > 0 && (
              <Card title="Ikke noget for mig" icon={<MinusCircle className="w-4 h-4" />} delay={120}>
                <div className="flex flex-wrap gap-2">
                  {data.nonInterests.map((interest) => (
                    <InterestBadge
                      key={interest.interest_id}
                      name={interest.interest_da}
                      variant="muted"
                      size="sm"
                      className="line-through decoration-gray-400 decoration-1"
                    />
                  ))}
                </div>
              </Card>
            )}

            {/* Detaljer (Strava + email combined) */}
            {(stravaAthleteId != null || (isOwn && data.email)) && (
              <Card title="Detaljer" delay={180}>
                <div className="space-y-3">
                  {stravaAthleteId != null && (
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
                  )}
                  {isOwn && data.email && (
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                      <span className="text-gray-600 shrink-0">Email:</span>
                      <span className="text-gray-900 truncate">{data.email}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}
            {isOwn && (
              <Card title="Følger" icon={<UserCheck className="w-4 h-4" />} delay={240}>
                <FollowingCard userId={data.profile_id} />
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
  const iconColor = tone === "violet" ? "text-violet-600" : tone === "red" ? "text-red-500" : "text-gray-500";

  return (
    <section
      className="card-reveal rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2" style={{ textWrap: "balance" }}>
          <span className={iconColor}>{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({ value, label, hint, tone = "default" }: { value: number; label: string; hint?: string; tone?: "default" | "violet" }) {
  const valueColor = tone === "violet" ? "text-violet-700" : "text-gray-900";
  return (
    <div className="flex flex-col">
      <span className={`text-2xl font-semibold tabular-nums leading-none ${valueColor}`}>{value}</span>
      <span className="text-xs text-gray-500 mt-1">
        {label}
        {hint ? <span className="hidden sm:inline text-gray-400"> · {hint}</span> : null}
      </span>
    </div>
  );
}
