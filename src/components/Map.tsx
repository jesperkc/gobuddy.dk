import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";

// Custom marker icon
const customIcon = new L.Icon({
  iconUrl: "/location-icon.svg",
  iconSize: [128, 128],
  iconAnchor: [64, 64],
  // popupAnchor: [1, -34],
  // shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  // shadowSize: [41, 41],
});

function MapUpdater({
  coords,
}: {
  coords?: {
    lat: number;
    lng: number;
  };
}) {
  const map = useMap();
  useEffect(() => {
    if (!coords) {
      map.setView({ lat: 40, lng: 0 }, 1);
    } else {
      map.setView(coords, 13);
    }
  }, [coords, map]);
  return null;
}

export const Map = ({
  coords,
}: {
  coords?: {
    lat: number;
    lng: number;
  };
}) => {
  return (
    <MapContainer center={coords} zoom={1} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png"
      />
      {coords && coords.lng !== 0 && (
        <Marker position={coords} icon={customIcon} />
      )}
      <MapUpdater coords={coords} />
    </MapContainer>
  );
};
