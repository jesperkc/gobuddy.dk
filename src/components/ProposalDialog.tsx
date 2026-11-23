import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActivityLocationPicker } from "@/components/ActivityLocationPicker";
import { useAuth } from "@/contexts/AuthContext";
import { useChatPopupStore } from "@/store/chatPopup";
import { requireVerifiedEmail } from "@/store/emailVerification";
import { supabase } from "@/lib/supabase";
import { buildProposalSentence, joinPlace, sendProposal } from "@/lib/proposals";
import { dateLocal } from "@/lib/localDate";

interface ProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buddyId: string;
  buddyName: string | null;
  /** After sending. Defaults to opening the chat popup with the buddy. */
  onSent?: () => void;
}

interface InterestOption {
  interest_id: string;
  interest_da: string;
}

/**
 * One-step "Foreslå en tur": pick a shared interest, a date, optional time and
 * a place. Creates a two-person event and sends it to the buddy as a message.
 */
export function ProposalDialog({ open, onOpenChange, buddyId, buddyName, onSent }: ProposalDialogProps) {
  const { user } = useAuth();
  const openChat = useChatPopupStore((s) => s.openChat);

  const [myInterests, setMyInterests] = useState<InterestOption[]>([]);
  const [buddyInterestIds, setBuddyInterestIds] = useState<Set<string> | null>(null);
  const [interestId, setInterestId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | undefined>();
  const [submitting, setSubmitting] = useState(false);

  // Shared interests first, then the rest of mine, so there's always something to pick.
  const options = useMemo<InterestOption[]>(() => {
    if (!buddyInterestIds) return myInterests;
    return [
      ...myInterests.filter((i) => buddyInterestIds.has(i.interest_id)),
      ...myInterests.filter((i) => !buddyInterestIds.has(i.interest_id)),
    ];
  }, [myInterests, buddyInterestIds]);

  // Load everything the form needs ourselves; the chat pages don't populate the profile store.
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    setDate("");
    setTime("");
    setMeetingPoint("");
    Promise.all([
      supabase.from("user_interests").select("interest_id, interests (interest_da)").eq("profile_id", user.id).eq("is_non_interest", false),
      supabase.from("user_interests").select("interest_id").eq("profile_id", buddyId).eq("is_non_interest", false),
      supabase.from("profiles").select("city, latitude:approx_latitude, longitude:approx_longitude").eq("profile_id", user.id).single(),
    ]).then(([mine, theirs, me]) => {
      if (cancelled) return;
      setMyInterests(
        (mine.data ?? []).flatMap((r) => {
          const interest = Array.isArray(r.interests) ? r.interests[0] : r.interests;
          return interest ? [{ interest_id: r.interest_id, interest_da: interest.interest_da }] : [];
        }),
      );
      setBuddyInterestIds(new Set((theirs.data ?? []).map((r) => r.interest_id)));
      setPlaceName(me.data?.city ?? "");
      setCoordinates(me.data?.latitude && me.data?.longitude ? { lat: me.data.latitude, lng: me.data.longitude } : undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [open, user, buddyId]);

  useEffect(() => {
    if (options.length && !options.some((o) => o.interest_id === interestId)) setInterestId(options[0].interest_id);
  }, [options, interestId]);

  const selected = options.find((o) => o.interest_id === interestId);
  const canSubmit = !!selected && !!date && !!placeName.trim() && !!coordinates && !submitting;
  const preview =
    selected && date && placeName
      ? buildProposalSentence(selected.interest_da.toLowerCase(), date, time || null, joinPlace(placeName, meetingPoint))
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selected || !coordinates || !canSubmit) return;
    if (!requireVerifiedEmail()) return;
    setSubmitting(true);
    try {
      await sendProposal(user.id, buddyName, selected.interest_da, {
        buddyId,
        interestId: selected.interest_id,
        interestName: selected.interest_da.toLowerCase(),
        date,
        time: time || null,
        placeName: placeName.trim(),
        meetingPoint: meetingPoint.trim() || undefined,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
      });
      toast.success("Forslag sendt!");
      onOpenChange(false);
      if (onSent) onSent();
      else openChat(buddyId, buddyName);
    } catch (err) {
      console.error("Error sending proposal:", err);
      toast.error("Kunne ikke sende forslaget. Prøv igen.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Foreslå en tur{buddyName ? ` med ${buddyName}` : ""}</DialogTitle>
          <DialogDescription>Et konkret tidspunkt er nemmere at sige ja til end "en dag".</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="proposal-interest">Hvad</Label>
            <Select value={interestId} onValueChange={setInterestId}>
              <SelectTrigger id="proposal-interest" className="mt-1">
                <SelectValue placeholder="Vælg interesse" />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.interest_id} value={o.interest_id}>
                    {buddyInterestIds?.has(o.interest_id) ? `${o.interest_da} · I har den til fælles` : o.interest_da}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="proposal-date">Dato</Label>
              <Input
                id="proposal-date"
                type="date"
                value={date}
                min={dateLocal()}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="proposal-time">Tid (valgfri)</Label>
              <Input id="proposal-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label>Hvor</Label>
            <div className="mt-1">
              <ActivityLocationPicker
                coordinates={coordinates}
                placeName={placeName}
                setPlaceName={setPlaceName}
                setCoordinates={setCoordinates}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="proposal-meeting-point">Mødested (valgfri)</Label>
            <Input
              id="proposal-meeting-point"
              value={meetingPoint}
              onChange={(e) => setMeetingPoint(e.target.value)}
              placeholder="Fx: ved Dronning Louises Bro"
              maxLength={80}
              className="mt-1"
            />
          </div>

          {preview && <p className="text-sm text-gray-600 rounded-xl bg-gray-50 px-3 py-2 whitespace-pre-line">{preview}</p>}

          <Button type="submit" disabled={!canSubmit} className="w-full rounded-full" size="lg">
            {submitting ? "Sender..." : `Send forslag${buddyName ? ` til ${buddyName}` : ""}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
