import { useState } from "react";
import { CalendarClock, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { dateLocal } from "@/lib/localDate";

/**
 * UI for suggesting another time on an event and answering the suggestion.
 * Presentational only: no data access yet, so the flow can be judged in Storybook first.
 */

export interface TimeSuggestion {
  date: string;
  time: string | null;
  note: string;
  status: "pending" | "approved" | "declined" | "withdrawn";
  /** First name of whoever suggested it. */
  suggestedBy: string;
}

export function formatSuggestionTime(date: string, time: string | null): string {
  const day = new Date(date + "T00:00:00").toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long" });
  return time ? `${day} kl. ${time.slice(0, 5)}` : day;
}

interface SuggestTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorName: string;
  onSubmit: (input: { date: string; time: string | null; note: string }) => void;
}

/** Invitee picks a date, optional time and an optional note to the creator. */
export function SuggestTimeDialog({ open, onOpenChange, creatorName, onSubmit }: SuggestTimeDialogProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;
    onSubmit({ date, time: time || null, note: note.trim() });
    setDate("");
    setTime("");
    setNote("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Foreslå et andet tidspunkt</DialogTitle>
          <DialogDescription>{creatorName} får dit forslag og kan sige ja eller nej. Tidspunktet ændres først, når {creatorName} har godkendt.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="suggest-date">Dato</Label>
              <Input id="suggest-date" type="date" min={dateLocal()} value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="suggest-time">Tid (valgfri)</Label>
              <Input id="suggest-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label htmlFor="suggest-note">Besked (valgfri)</Label>
            <Textarea id="suggest-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Fx: Jeg skal arbejde lørdag" maxLength={200} className="mt-1" />
          </div>
          <Button type="submit" disabled={!date} className="w-full rounded-full" size="lg">
            Send forslag
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface TimeSuggestionCardProps {
  suggestion: TimeSuggestion;
  /** Who is looking: the event's creator answers, the suggester can withdraw. */
  viewer: "creator" | "suggester";
  onApprove?: () => void;
  onDecline?: () => void;
  onWithdraw?: () => void;
}

/** The suggestion as shown on the event page, with the actions that fit the viewer and status. */
export function TimeSuggestionCard({ suggestion, viewer, onApprove, onDecline, onWithdraw }: TimeSuggestionCardProps) {
  const { status, suggestedBy, note } = suggestion;
  const when = formatSuggestionTime(suggestion.date, suggestion.time);

  const tone =
    status === "approved" ? "bg-green-50 border-green-200 text-green-800" : status === "pending" ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-gray-50 border-gray-200 text-gray-600";

  const heading = {
    pending: viewer === "creator" ? `${suggestedBy} foreslår et andet tidspunkt` : "Du har foreslået et andet tidspunkt",
    approved: "Nyt tidspunkt godkendt",
    declined: viewer === "creator" ? "Du afviste forslaget" : "Forslaget blev afvist",
    withdrawn: "Forslaget er trukket tilbage",
  }[status];

  return (
    <div className={`rounded-lg border p-3 text-sm ${tone}`} role="region" aria-label="Forslag til nyt tidspunkt">
      <p className="flex items-center gap-1.5 font-medium">
        <CalendarClock className="h-4 w-4" />
        {heading}
      </p>
      <p className="mt-1 capitalize">{when}</p>
      {note && <p className="mt-1 italic">“{note}”</p>}

      {status === "pending" && viewer === "creator" && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={onApprove}>
            <Check className="h-4 w-4 mr-1" />
            Godkend
          </Button>
          <Button size="sm" variant="outline" onClick={onDecline}>
            <X className="h-4 w-4 mr-1" />
            Afvis
          </Button>
        </div>
      )}
      {status === "pending" && viewer === "suggester" && (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs">Venter på svar</span>
          <Button size="sm" variant="outline" onClick={onWithdraw}>
            Træk tilbage
          </Button>
        </div>
      )}
    </div>
  );
}
