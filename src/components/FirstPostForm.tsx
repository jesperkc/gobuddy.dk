import { useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { InterestBadge } from "@/components/InterestBadge";
import { dateLocal } from "@/lib/localDate";

export interface FirstPostValues {
  title: string;
  description: string;
  /** Local date, YYYY-MM-DD */
  activityDate: string;
}

interface FirstPostFormProps {
  interest: { name: string; icon: string };
  /** 1-based position of this interest in the list, and the list length. */
  step: number;
  total: number;
  /** Verified users publish straight away; others save a draft. */
  verified: boolean;
  submitting: boolean;
  onSave: (values: FirstPostValues) => void;
  onSkip: () => void;
}

const DATE_CHIPS = [
  { daysAgo: 0, label: "I dag" },
  { daysAgo: 1, label: "I går" },
  { daysAgo: 2, label: "I forgårs" },
];

const chipClass =
  "min-h-10 rounded-full px-3 sm:px-4 py-2 h-auto text-sm font-medium data-[state=on]:bg-gray-900 data-[state=on]:text-white data-[state=on]:border-gray-900";

/** Segments only read well for a handful of steps; beyond that show the number. */
const MAX_SEGMENTS = 8;

function StepProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="sr-only">
        Interesse {step} af {total}
      </span>
      {total <= MAX_SEGMENTS ? (
        <div className="flex gap-1" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 w-5 rounded-full ${i + 1 < step ? "bg-green-500" : i + 1 === step ? "bg-gray-900" : "bg-gray-200"}`}
            />
          ))}
        </div>
      ) : (
        <span className="text-xs text-gray-500 tabular-nums" aria-hidden="true">
          {step} af {total}
        </span>
      )}
    </div>
  );
}

export function FirstPostForm({ interest, step, total, verified, submitting, onSave, onSkip }: FirstPostFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activityDate, setActivityDate] = useState(() => dateLocal());
  const [customDate, setCustomDate] = useState(false);

  const canSubmit = !!title.trim() && !!activityDate && !submitting;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSave({ title: title.trim(), description: description.trim(), activityDate });
      }}
      className="card-reveal rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm"
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        <InterestBadge name={interest.name} icon={interest.icon} variant="default" />
        <StepProgress step={step} total={total} />
      </div>

      <h2 className="text-xl font-semibold tracking-tight text-gray-900 text-balance">
        Hvornår lavede du sidst noget med {interest.name.toLowerCase()}?
      </h2>
      <p className="text-sm text-gray-500 mt-1.5 mb-6">Skriv et par ord, så andre kan se, hvad du går op i.</p>

      <div className="space-y-5">
        <div>
          <p id="first-post-date-label" className="text-sm font-medium text-gray-700 mb-2">
            Hvornår var det?
          </p>
          <div role="group" aria-labelledby="first-post-date-label" className="flex flex-wrap gap-1.5 sm:gap-2">
            {DATE_CHIPS.map(({ daysAgo, label }) => (
              <Toggle
                key={daysAgo}
                variant="outline"
                pressed={!customDate && activityDate === dateLocal(daysAgo)}
                onPressedChange={(pressed) => {
                  if (!pressed) return;
                  setCustomDate(false);
                  setActivityDate(dateLocal(daysAgo));
                }}
                className={chipClass}
              >
                {label}
              </Toggle>
            ))}
            <Toggle variant="outline" pressed={customDate} onPressedChange={(pressed) => pressed && setCustomDate(true)} className={chipClass}>
              Tidligere…
            </Toggle>
          </div>
          {customDate && (
            <Input
              id="first-post-date"
              type="date"
              aria-label="Vælg dato"
              value={activityDate}
              max={dateLocal()}
              onChange={(e) => setActivityDate(e.target.value)}
              required
              className="mt-3 w-full sm:w-auto"
            />
          )}
        </div>

        <div>
          <Label htmlFor="first-post-title" className="block text-sm font-medium text-gray-700 mb-2">
            Hvad lavede du?
          </Label>
          <Input
            id="first-post-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Fx en løbetur langs søerne"
            maxLength={120}
            required
            className="h-11 text-base"
          />
        </div>

        <div>
          <Label htmlFor="first-post-description" className="block text-sm font-medium text-gray-700 mb-2">
            Fortæl lidt mere <span className="font-normal text-gray-500">(valgfrit)</span>
          </Label>
          <Textarea
            id="first-post-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="resize-none text-base"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button variant="dark" type="submit" size="lg" disabled={!canSubmit} className="w-full sm:w-auto px-6">
          {submitting ? "Gemmer..." : verified ? "Del opslag" : "Gem opslag"}
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={onSkip} className="w-full sm:w-auto text-gray-600">
          Spring over
        </Button>
      </div>

      {!verified && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          Opslaget går live, så snart du har bekræftet din email.
        </p>
      )}
    </form>
  );
}
