import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { haversineDistance } from "./geo";

/**
 * Checks browser geolocation on mount and updates the user's profile
 * if they've moved more than 100m since last stored coordinates.
 */
export function useLocationUpdate(
  user: User | null | undefined,
  profile: { latitude?: number | null; longitude?: number | null; profile_id?: string } | null,
  loadProfile: (user: User) => void,
) {
  const lat = profile?.latitude;
  const lng = profile?.longitude;

  useEffect(() => {
    if (!user || !profile) return;
    if (lat == null || lng == null) return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const distance = haversineDistance(lat, lng, latitude, longitude);

        if (distance < 0.1) return;

        let city: string | undefined;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=da_DK`,
          );
          const geo = await res.json();
          city = geo.address?.city || geo.address?.town || geo.address?.village || geo.address?.municipality;
        } catch {
          // ignore
        }

        const updates: Record<string, unknown> = { coordinates: `POINT(${latitude} ${longitude})` };
        if (city) updates.city = city;

        const { error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("profile_id", user.id);

        if (!error) {
          loadProfile(user);
        }
      },
      () => {},
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }, [user, profile?.profile_id]);
}
