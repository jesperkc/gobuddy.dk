import { Loader2, MapPin, Search } from "lucide-react";
import { useRef, useState, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { InputWithIcon } from "./ui/input-width-icon";

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

interface ActivityLocationPickerProps {
  coordinates: { lat: number; lng: number } | undefined;
  placeName: string;
  setPlaceName: (name: string) => void;
  setCoordinates: (coords: { lat: number; lng: number }) => void;
}

function MapController({
  coords,
  onDragEnd,
}: {
  coords: { lat: number; lng: number };
  onDragEnd: (center: { lat: number; lng: number }) => void;
}) {
  const map = useMap();
  const callbackRef = useRef(onDragEnd);
  callbackRef.current = onDragEnd;
  const programmaticMove = useRef(false);
  const prevCoords = useRef(coords);

  // Update map center when coords change from outside (search select)
  useEffect(() => {
    if (prevCoords.current.lat !== coords.lat || prevCoords.current.lng !== coords.lng) {
      prevCoords.current = coords;
      programmaticMove.current = true;
      map.setView(coords, 13);
    }
  }, [coords, map]);

  // Listen for user drag
  useEffect(() => {
    const handler = () => {
      if (programmaticMove.current) {
        programmaticMove.current = false;
        return;
      }
      const center = map.getCenter();
      callbackRef.current({ lat: center.lat, lng: center.lng });
    };
    map.on("moveend", handler);
    return () => { map.off("moveend", handler); };
  }, [map]);

  return null;
}

export function ActivityLocationPicker({
  coordinates,
  placeName,
  setPlaceName,
  setCoordinates,
}: ActivityLocationPickerProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isReversing, setIsReversing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const reverseDebounceRef = useRef<ReturnType<typeof setTimeout>>();


  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`,
      );
      const data: SearchResult[] = await response.json();
      setSearchResults(data);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsReversing(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      );
      const data = await response.json();
      if (data?.display_name) {
        setPlaceName(data.display_name);
      }
    } catch (error) {
      console.error("Reverse geocode error:", error);
    } finally {
      setIsReversing(false);
    }
  }, [setPlaceName]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPlaceName(value);
    setShowSuggestions(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(value), 1000);
  };

  const handleSelect = (result: SearchResult) => {
    setPlaceName(result.display_name);
    setCoordinates({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
    setShowSuggestions(false);
    setSearchResults([]);
  };

  const handleDragEnd = useCallback((center: { lat: number; lng: number }) => {
    setCoordinates(center);
    clearTimeout(reverseDebounceRef.current);
    reverseDebounceRef.current = setTimeout(() => reverseGeocode(center.lat, center.lng), 500);
  }, [setCoordinates, reverseGeocode]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <InputWithIcon
          type="text"
          value={placeName}
          onChange={handleInputChange}
          onFocus={() => {
            if (searchResults.length > 0) setShowSuggestions(true);
          }}
          onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
          placeholder="Søg efter sted, f.eks. Fælledparken"
          autoComplete="off"
          icon={<Search />}
        />
        {(isSearching || isReversing) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-gray-400" />
        )}

        {showSuggestions && searchResults.length > 0 && (
          <div className="absolute z-[1000] w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-auto">
            {searchResults.map((result, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelect(result)}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-hidden"
              >
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-gray-400 shrink-0" />
                  <span className="truncate">{result.display_name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {coordinates && (
        <div className="relative h-[250px] w-full rounded-lg overflow-hidden border border-gray-100">
          {/* Fixed center marker */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
            <img src="/location-icon.svg" alt="" className="w-16 h-16" />
          </div>
          <MapContainer center={coordinates} zoom={13} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png"
            />
            <MapController coords={coordinates} onDragEnd={handleDragEnd} />
          </MapContainer>
        </div>
      )}
    </div>
  );
}
