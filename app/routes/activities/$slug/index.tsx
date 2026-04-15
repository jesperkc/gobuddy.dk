import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, MapPin, Users, AlertTriangle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { DefaultLayout } from "../../../../src/components/AppShell";
import { ProtectedRoute } from "../../../../src/components/ProtectedRoute";
import { useAuth } from "../../../../src/contexts/AuthContext";
import { useEventsStore, formatEventDate, type EventWithDetails } from "../../../../src/store/events";
import { Button } from "../../../../src/components/ui/button";
import { Avatar, AvatarFallback } from "../../../../src/components/ui/avatar";
import { Map } from "../../../../src/components/Map";
import { Skeleton } from "../../../../src/components/ui/skeleton";
import { InterestBadge } from "../../../../src/components/InterestBadge";

function EventDetailPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const { fetchEvent, joinEvent, leaveEvent, cancelEvent } = useEventsStore();
  const [event, setEvent] = useState<EventWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchEvent(slug).then((e) => {
      setEvent(e);
      setLoading(false);
    });
  }, [slug, fetchEvent]);

  if (loading) {
    return (
      <DefaultLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </DefaultLayout>
    );
  }

  if (!event) {
    return (
      <DefaultLayout>
        <div className="text-center text-gray-400">
          <p className="text-lg font-medium">Aktivitet ikke fundet</p>
          <Link to="/activities" className="text-blue-700 hover:underline mt-2 inline-block">
            ← Tilbage til aktiviteter
          </Link>
        </div>
      </DefaultLayout>
    );
  }

  const isCreator = user?.id === event.creator.profile_id;
  const isParticipant = event.event_participants.some((p) => p.profile_id === user?.id);
  const isCancelled = !!event.cancelled_at;
  const isPast = event.date_type === "specific" && event.event_date && event.event_date < new Date().toISOString().split("T")[0];
  const isFull = event.max_participants != null && event.event_participants.length >= event.max_participants;
  const interests = event.event_interests.map((ei) => ei.interests);

  const handleJoin = async () => {
    if (!user) return;
    setActionLoading(true);
    const ok = await joinEvent(event.event_id, user.id);
    if (ok) {
      toast.success("Du er nu tilmeldt!");
      const updated = await fetchEvent(slug);
      if (updated) setEvent(updated);
    } else {
      toast.error("Kunne ikke tilmelde dig");
    }
    setActionLoading(false);
  };

  const handleLeave = async () => {
    if (!user) return;
    setActionLoading(true);
    const ok = await leaveEvent(event.event_id, user.id);
    if (ok) {
      toast.success("Du er nu afmeldt");
      const updated = await fetchEvent(slug);
      if (updated) setEvent(updated);
    } else {
      toast.error("Kunne ikke afmelde dig");
    }
    setActionLoading(false);
  };

  const handleCancel = async () => {
    if (!confirm("Er du sikker på, at du vil aflyse denne aktivitet?")) return;
    setActionLoading(true);
    const ok = await cancelEvent(event.event_id);
    if (ok) {
      toast.success("Aktivitet aflyst");
      const updated = await fetchEvent(slug);
      if (updated) setEvent(updated);
    } else {
      toast.error("Kunne ikke aflyse aktiviteten");
    }
    setActionLoading(false);
  };

  return (
    <DefaultLayout>
      <div className="space-y-6">
        {/* Back link */}
        <Link
          to="/activities"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Alle aktiviteter
        </Link>

        {/* Status banners */}
        {isCancelled && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4 flex items-center gap-2 text-red-700 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Denne aktivitet er aflyst
          </div>
        )}
        {isPast && !isCancelled && (
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 mb-4 text-gray-500 text-sm">
            Denne aktivitet er afsluttet
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h1>

        {/* Meta */}
        <div className="flex flex-col gap-1.5 text-sm text-gray-500 mb-4">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span className="capitalize">{formatEventDate(event)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {event.place_name}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {event.event_participants.length} deltager{event.event_participants.length !== 1 ? "e" : ""}
            {event.max_participants && ` / ${event.max_participants}`}
          </span>
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-gray-700 mb-6 whitespace-pre-wrap">{event.description}</p>
        )}

        {/* Interests */}
        {interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {interests.map((interest) => (
              <InterestBadge
                key={interest.interest_id}
                name={interest.interest_da}
                icon={interest.icon}
              />
            ))}
          </div>
        )}

        {/* Map */}
        <div className="rounded-2xl overflow-hidden border border-gray-100 mb-6">
          <Map coords={{ lat: event.latitude, lng: event.longitude }} />
        </div>

        {/* Actions */}
        {!isCancelled && !isPast && (
          <div className="flex gap-3 mb-8">
            {!isParticipant && !isFull && (
              <Button onClick={handleJoin} disabled={actionLoading}>
                {actionLoading ? "..." : "Deltag"}
              </Button>
            )}
            {!isParticipant && isFull && (
              <Button disabled>Fuldt booket</Button>
            )}
            {isParticipant && !isCreator && (
              <Button variant="outline" onClick={handleLeave} disabled={actionLoading}>
                {actionLoading ? "..." : "Afmeld"}
              </Button>
            )}
            {isCreator && (
              <>
                <Button variant="outline" asChild>
                  <Link to="/activities/$slug/rediger" params={{ slug }}>
                    <Pencil className="h-4 w-4 mr-1.5" />
                    Rediger
                  </Link>
                </Button>
                <Button variant="destructive" onClick={handleCancel} disabled={actionLoading}>
                  Aflys
                </Button>
              </>
            )}
          </div>
        )}

        {/* Creator */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Oprettet af</h2>
          <Link
            to="/buddy/$slug"
            params={{ slug: event.creator.slug }}
            className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-blue-900"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">
                {event.creator.first_name?.slice(0, 2).toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            {event.creator.first_name ?? "Ukendt"}
          </Link>
        </div>

        {/* Participants */}
        {event.event_participants.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">
              Deltagere ({event.event_participants.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {event.event_participants.map(({ profiles: p }) => (
                <Link
                  key={p.profile_id}
                  to="/buddy/$slug"
                  params={{ slug: p.slug }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px]">
                      {p.first_name?.slice(0, 2).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  {p.first_name ?? "Ukendt"}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </DefaultLayout>
  );
}

function ProtectedEventDetailPage() {
  return (
    <ProtectedRoute redirectTo="/login">
      <EventDetailPage />
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/activities/$slug/")({
  component: ProtectedEventDetailPage,
});
