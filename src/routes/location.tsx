import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2, MapPin, Search } from "lucide-react";
import { SplitScreen } from "../components/SplitScreen";
import { useOnboardingStore } from "../store/onboarding";
import { useRef, useState } from "react";
import { Map } from "../components/Map";
import { Button } from "@/components/ui/button";
import { Or } from "@/components/ui/ui";
import { InputWithIcon } from "@/components/ui/input-width-icon";

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode: string;
    country: string;
    country_code: string;
  };
}

export function Location() {
  const navigate = useNavigate();
  const { setAddress, setCoordinates, coordinates } = useOnboardingStore();
  // const [coords, setCoords] = useState<[number, number]>([40, 0]);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<number>();
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleGeolocation = () => {
    if ("geolocation" in navigator) {
      setIsLocating(true);
      setLocationError("");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // setCoords([latitude, longitude]);
          setCoordinates({ lat: latitude, lng: longitude });
          // setLocation("Location detected");
          getAddress({ lat: latitude, lng: longitude });
          setIsLocating(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationError(
            "Could not get your location. Please try again or enter your city manually."
          );
          setIsLocating(false);
        }
      );
    }
  };

  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&addressdetails=1&limit=5`
      );
      const data: SearchResult[] = await response.json();
      setSearchResults(
        data.filter(
          (result) =>
            result.address.city || result.address.town || result.address.village
        )
      );
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const getAddress = async (location: { lat: number; lng: number }) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&accept-language=da_DK`
    );
    const address = await response.json();
    if (address.address) {
      setAddress({
        // house_number: address.address.house_number,
        // road: address.address.road,
        postcode: address.address.postcode,
        city: address.address.city,
        country: address.address.country,
        country_code: address.address.country_code,
      });
      return;
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSuggestions(true);

    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = window.setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  const handleLocationSelect = (result: SearchResult) => {
    const cityName =
      result.address.city ||
      result.address.town ||
      result.address.village ||
      "";
    setAddress({
      ...location,
      postcode: result.address.postcode,
      city: cityName,
      country: result.address.country,
      country_code: result.address.country_code,
    });
    setSearchQuery(cityName);
    // setCoords([parseFloat(result.lat), parseFloat(result.lon)]);
    setCoordinates({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    });
    setShowSuggestions(false);
    setSearchResults([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/signup" });
  };

  return (
    <SplitScreen>
      <div>
        <h1 className="text-2xl font-bold mb-6">Hvor i verden er du?</h1>
        <div className="space-y-6">
          <div className="h-[300px] w-full rounded-lg overflow-hidden shadow-md mb-6">
            <Map coords={coordinates} />
          </div>

          <Button onClick={handleGeolocation} disabled={isLocating}>
            {isLocating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Henter placering...</span>
              </>
            ) : (
              <>
                <MapPin size={20} />
                Del min placering
              </>
            )}
          </Button>
          {/* <button

            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >

          </button> */}

          {locationError && (
            <div className="text-red-600 text-sm">{locationError}</div>
          )}
          <Or />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="search-container relative">
              <div className="relative">
                <InputWithIcon
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Søg efter din by"
                  autoComplete="off"
                  icon={<Search />}
                />
                {/* <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Søg efter din by"
                  autoComplete="off"
                /> */}
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 animate-spin text-gray-400" />
                )}
              </div>

              {showSuggestions && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-auto">
                  {searchResults.map((result, index) => {
                    const city =
                      result.address.city ||
                      result.address.town ||
                      result.address.village;
                    const location = `${city}, ${result.address.country}`;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleLocationSelect(result)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-gray-400" />
                          <span>{location}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant={"secondary"}
                onClick={() => navigate({ to: "/interests" })}
              >
                Tilbage
              </Button>
              <Button
                type="submit"
                disabled={!coordinates}
                onClick={() => navigate({ to: "/location" })}
                className="ml-auto"
              >
                Videre
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </SplitScreen>
  );
}
