/**
 * A short, human label for a Nominatim result: the place's own name ("Søerne"),
 * else street and number, else the first part of the full address.
 */
export function shortPlaceName(result: { name?: string; display_name: string; address?: { road?: string; house_number?: string } }): string {
  if (result.name?.trim()) return result.name.trim();
  const road = result.address?.road;
  if (road) return result.address?.house_number ? `${road} ${result.address?.house_number}` : road;
  return result.display_name.split(",")[0].trim();
}

const MEETING_POINT_SEPARATOR = " – ";

/** "Søerne – ved Dronning Louises Bro": the place's short name plus the optional meeting-point detail. */
export function joinPlace(placeName: string, meetingPoint?: string | null): string {
  const detail = meetingPoint?.trim();
  return detail ? `${placeName.trim()}${MEETING_POINT_SEPARATOR}${detail}` : placeName.trim();
}

/** The reverse of joinPlace, for editing a saved event: "Søerne – ved broen" → name and detail. */
export function splitPlace(stored: string): { placeName: string; meetingPoint: string } {
  const i = stored.indexOf(MEETING_POINT_SEPARATOR);
  if (i === -1) return { placeName: stored, meetingPoint: "" };
  return { placeName: stored.slice(0, i), meetingPoint: stored.slice(i + MEETING_POINT_SEPARATOR.length) };
}
