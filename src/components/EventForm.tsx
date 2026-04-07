import { useState } from "react";
import { Button } from "./ui/button";
import { ActivityLocationPicker } from "./ActivityLocationPicker";
import { ActivityInterestsPicker } from "./ActivityInterestsPicker";
import type { DateType, TimeOfDay } from "@/store/events";

export interface EventFormData {
  title: string;
  description: string;
  placeName: string;
  latitude: number;
  longitude: number;
  dateType: DateType;
  eventDate: string | null;
  eventWeekdays: number[];
  eventTime: string | null;
  timeOfDay: TimeOfDay[];
  interestIds: string[];
  maxParticipants: number | null;
}

export interface InterestOption {
  interest_id: string;
  interest_da: string;
  icon: string;
}

export interface EventFormInitialData {
  title: string;
  description: string;
  placeName: string;
  latitude: number;
  longitude: number;
  dateType: DateType;
  eventDate: string;
  eventWeekdays: number[];
  timeMode: "none" | "specific" | "timeofday";
  eventTime: string;
  timeOfDay: TimeOfDay[];
  interestIds: string[];
  maxParticipants: string;
}

interface EventFormProps {
  onSubmit: (data: EventFormData) => Promise<void>;
  submitting: boolean;
  myInterests: InterestOption[];
  initialData?: EventFormInitialData;
  submitLabel?: string;
  submittingLabel?: string;
}

const DATE_TYPE_OPTIONS: { value: DateType; label: string }[] = [
  { value: "any", label: "Når som helst" },
  { value: "specific", label: "Bestemt dato" },
  { value: "weekday", label: "Hverdage" },
  { value: "weekend", label: "Weekend" },
  { value: "weekdays_custom", label: "Bestemte ugedage" },
];

const WEEKDAYS = [
  { value: 1, label: "Man" },
  { value: 2, label: "Tir" },
  { value: 3, label: "Ons" },
  { value: 4, label: "Tor" },
  { value: 5, label: "Fre" },
  { value: 6, label: "Lør" },
  { value: 7, label: "Søn" },
];

const TIME_OF_DAY_OPTIONS: { value: TimeOfDay; label: string }[] = [
  { value: "morgen", label: "Morgen" },
  { value: "formiddag", label: "Formiddag" },
  { value: "eftermiddag", label: "Eftermiddag" },
  { value: "aften", label: "Aften" },
];

export function EventForm({ onSubmit, submitting, myInterests, initialData, submitLabel, submittingLabel }: EventFormProps) {
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | undefined>(
    initialData ? { lat: initialData.latitude, lng: initialData.longitude } : undefined,
  );
  const [placeName, setPlaceName] = useState(initialData?.placeName ?? "");

  // Interests state
  const [selectedInterestIds, setSelectedInterestIds] = useState<Record<string, boolean>>(
    initialData ? Object.fromEntries(initialData.interestIds.map((id) => [id, true])) : {},
  );

  // Date/time state
  const [dateType, setDateType] = useState<DateType>(initialData?.dateType ?? "any");
  const [eventDate, setEventDate] = useState(initialData?.eventDate ?? "");
  const [eventWeekdays, setEventWeekdays] = useState<number[]>(initialData?.eventWeekdays ?? []);
  const [timeMode, setTimeMode] = useState<"none" | "specific" | "timeofday">(initialData?.timeMode ?? "none");
  const [eventTime, setEventTime] = useState(initialData?.eventTime ?? "");
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay[]>(initialData?.timeOfDay ?? []);

  const [maxParticipants, setMaxParticipants] = useState(initialData?.maxParticipants ?? "");

  // Title/description — last, with auto-generated title
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [titleTouched, setTitleTouched] = useState(!!initialData);
  const [description, setDescription] = useState(initialData?.description ?? "");

  // Auto-generate title from selected interests + place
  const selectedNames = myInterests
    .filter((i) => selectedInterestIds[i.interest_id])
    .map((i) => i.interest_da);

  const placeShort = placeName ? placeName.split(",")[0].trim() : "";
  const autoTitle =
    selectedNames.length > 0
      ? selectedNames.join(" & ") + (placeShort ? ` i ${placeShort}` : "")
      : "";

  const displayTitle = titleTouched ? title : autoTitle;

  const toggleWeekday = (day: number) => {
    setEventWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalTitle = displayTitle.trim();
    if (!finalTitle) return;
    if (!coordinates || !placeName.trim()) return;

    await onSubmit({
      title: finalTitle,
      description: description.trim(),
      placeName: placeName.trim(),
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      dateType,
      eventDate: dateType === "specific" && eventDate ? eventDate : null,
      eventWeekdays: dateType === "weekdays_custom" ? eventWeekdays : [],
      eventTime: timeMode === "specific" && eventTime ? eventTime : null,
      timeOfDay: timeMode === "timeofday" ? timeOfDay : [],
      interestIds: Object.keys(selectedInterestIds).filter((id) => selectedInterestIds[id]),
      maxParticipants: maxParticipants ? parseInt(maxParticipants, 10) : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Interests */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Interesser</label>
        <ActivityInterestsPicker
          interests={myInterests}
          selectedIds={selectedInterestIds}
          toggle={(id) =>
            setSelectedInterestIds((prev) => ({
              ...prev,
              [id]: !prev[id],
            }))
          }
        />
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Sted *</label>
        <ActivityLocationPicker
          coordinates={coordinates}
          placeName={placeName}
          setPlaceName={setPlaceName}
          setCoordinates={setCoordinates}
        />
      </div>

      {/* Date type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Hvornår? *</label>
        <div className="flex flex-wrap gap-2">
          {DATE_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDateType(opt.value)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                dateType === opt.value ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Specific date picker */}
        {dateType === "specific" && (
          <div className="mt-3">
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        )}

        {/* Custom weekday selector */}
        {dateType === "weekdays_custom" && (
          <div className="mt-3 flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleWeekday(day.value)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  eventWeekdays.includes(day.value) ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Time */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tidspunkt</label>
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            onClick={() => setTimeMode("none")}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              timeMode === "none" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Ikke angivet
          </button>
          <button
            type="button"
            onClick={() => setTimeMode("specific")}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              timeMode === "specific" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Bestemt klokkeslæt
          </button>
          <button
            type="button"
            onClick={() => setTimeMode("timeofday")}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              timeMode === "timeofday" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Tid på dagen
          </button>
        </div>

        {timeMode === "specific" && (
          <input
            type="time"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}

        {timeMode === "timeofday" && (
          <div className="flex flex-wrap gap-2">
            {TIME_OF_DAY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setTimeOfDay((prev) => (prev.includes(opt.value) ? prev.filter((t) => t !== opt.value) : [...prev, opt.value]))
                }
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  timeOfDay.includes(opt.value) ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Max participants */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Maks antal deltagere</label>
        <input
          type="number"
          value={maxParticipants}
          onChange={(e) => setMaxParticipants(e.target.value)}
          placeholder="Ingen grænse"
          min={2}
          className="w-40 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
        <input
          type="text"
          value={displayTitle}
          onChange={(e) => {
            setTitle(e.target.value);
            setTitleTouched(true);
          }}
          placeholder="F.eks. Løbetur i Fælledparken"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          maxLength={200}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Fortæl mere om aktiviteten..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
          rows={3}
        />
      </div>

      {/* Submit */}
      <Button type="submit" disabled={submitting || !displayTitle.trim() || !coordinates}>
        {submitting ? (submittingLabel ?? "Opretter...") : (submitLabel ?? "Opret aktivitet")}
      </Button>
    </form>
  );
}
