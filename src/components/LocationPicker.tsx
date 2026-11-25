import { Loader2, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { Map } from "./Map";
import { Button } from "./ui/button";
import { InputWithIcon } from "./ui/input-width-icon";
import { Or } from "./ui/ui";

export interface SearchResult {
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

export interface IAddress {
  postcode: string;
  city: string;
  country: string;
  country_code: string;
}

export interface LocationPickerProps {
  coordinates: { lat: number; lng: number } | undefined;
  setAddress: (address: IAddress) => void;
  setCoordinates: (coords: { lat: number; lng: number }) => void;
  /** Prefill the search field, e.g. with the city already saved. */
  initialQuery?: string;
  /**
   * Admin editing another user: hide "Del min placering" (it would use the
   * admin's own position) and let the admin click the map to place the pin.
   */
  adminMode?: boolean;
}

export const LocationPicker = ({ coordinates, setAddress, setCoordinates, initialQuery = "", adminMode = false }: LocationPickerProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleGeolocation = () => {
    if ("geolocation" in navigator) {
      setIsLocating(true);
      setLocationError("");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates({ lat: latitude, lng: longitude });
          getAddress({ lat: latitude, lng: longitude });
          setIsLocating(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationError("Could not get your location. Please try again or enter your city manually.");
          setIsLocating(false);
        }
      );
    }
  };

  const getAddress = async (location: { lat: number; lng: number }) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&accept-language=da_DK`
    );
    const addressData = await response.json();
    if (addressData.address) {
      const city = addressData.address.city || addressData.address.town || addressData.address.village || "";
      setAddress({
        postcode: addressData.address.postcode || "",
        city,
        country: addressData.address.country || "",
        country_code: addressData.address.country_code || "",
      });
      setSearchQuery(city);
    }
  };

  const handleMapClick = async (location: { lat: number; lng: number }) => {
    setCoordinates(location);
    setLocationError("");
    try {
      await getAddress(location);
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      setLocationError("Kunne ikke finde en by for det valgte punkt.");
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
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`
      );
      const data: SearchResult[] = await response.json();
      setSearchResults(data.filter((result) => result.address.city || result.address.town || result.address.village));
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSuggestions(true);

    // Debounce search
    setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  const handleLocationSelect = (result: SearchResult) => {
    const cityName = result.address.city || result.address.town || result.address.village || "";
    setAddress({
      postcode: result.address.postcode,
      city: cityName,
      country: result.address.country,
      country_code: result.address.country_code,
    });
    setSearchQuery(cityName);
    setCoordinates({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    });
    setShowSuggestions(false);
    setSearchResults([]);
  };

  return (
    <div className="space-y-6">
      <div className="h-[300px] w-full rounded-lg overflow-hidden shadow-md mb-6">
        <Map coords={coordinates} onClick={adminMode ? handleMapClick : undefined} />
      </div>

      {adminMode && <p className="text-sm text-gray-500 -mt-4">Søg efter en by, eller klik på kortet for at placere brugeren præcist.</p>}

      {!adminMode && (
        <>
          <Button type="button" onClick={handleGeolocation} disabled={isLocating}>
            {isLocating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Henter placering...
              </>
            ) : (
              <>
                <MapPin size={20} className="mr-2" />
                Del min placering
              </>
            )}
          </Button>

          <Or />
        </>
      )}

      {locationError && <div className="text-red-600 ">{locationError}</div>}

      <div className="search-container relative">
        <div className="relative">
          <InputWithIcon
            type="text"
            value={searchQuery}
            onChange={handleSearchInputChange}
            onFocus={() => setShowSuggestions(true)}
            placeholder={adminMode ? "Søg efter by" : "Søg efter din by"}
            autoComplete="off"
            icon={<Search />}
          />
          {isSearching && <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 animate-spin text-gray-400" />}
        </div>

        {showSuggestions && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-auto">
            {searchResults.map((result, index) => {
              const city = result.address.city || result.address.town || result.address.village;
              const location = `${city}, ${result.address.country}`;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleLocationSelect(result)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-hidden"
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
    </div>
  );
};
