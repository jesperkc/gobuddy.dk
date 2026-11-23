import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const TILE = 256;
const ZOOM = 15;
const HEIGHT = 112;
const TILE_URL = "https://tiles.stadiamaps.com/tiles/outdoors";

/** Position of a coordinate in global pixel space at the given zoom (Web Mercator). */
function toPixel(lat: number, lng: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const sin = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

/**
 * A static, non-interactive map strip with the meeting point's pin centred. Built
 * from a 3×3 block of plain tile images, so a chat full of proposals doesn't mount
 * a Leaflet map per message.
 */
export function StaticPinMap({ lat, lng }: { lat: number; lng: number }) {
  const { x, y } = toPixel(lat, lng, ZOOM);
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  // Offset of the 3×3 block so the pin's pixel lands at the strip's centre.
  const left = `calc(50% - ${x - (tx - 1) * TILE}px)`;
  const top = HEIGHT / 2 - (y - (ty - 1) * TILE);

  return (
    <div className="relative w-full overflow-hidden bg-gray-100" style={{ height: HEIGHT }} aria-hidden>
      <div className="absolute grid grid-cols-3" style={{ left, top, width: TILE * 3 }}>
        {[-1, 0, 1].flatMap((dy) =>
          [-1, 0, 1].map((dx) => (
            <img key={`${dx},${dy}`} src={`${TILE_URL}/${ZOOM}/${tx + dx}/${ty + dy}.png`} alt="" width={TILE} height={TILE} loading="lazy" draggable={false} />
          )),
        )}
      </div>
      <img src="/location-icon.svg" alt="" className="absolute left-1/2 top-1/2 w-12 h-12 -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
}

/** Loads the proposal's pin by event slug and shows it, or nothing while loading or if it's gone. */
export function ProposalMapPreview({ slug }: { slug: string }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("events")
      .select("latitude, longitude")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.latitude != null && data?.longitude != null) setCoords({ lat: data.latitude, lng: data.longitude });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return coords ? <StaticPinMap lat={coords.lat} lng={coords.lng} /> : null;
}
