import { type IAddress, LocationPicker } from "@/components/LocationPicker";
import { SaveButton } from "./SaveButton";

interface LocationTabPanelProps {
  coordinates: { lat: number; lng: number } | undefined;
  address: IAddress;
  setAddress: (addr: IAddress) => void;
  setCoordinates: (
    coords: { lat: number; lng: number } | undefined,
  ) => void;
  onSave: () => void;
  saving: boolean;
  /** Admin editing another user — see LocationPicker's adminMode. */
  adminMode?: boolean;
}

export function LocationTabPanel({
  coordinates,
  address,
  setAddress,
  setCoordinates,
  onSave,
  saving,
  adminMode = false,
}: LocationTabPanelProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Placering</h2>

      {adminMode && (
        <p className="text-gray-600 mb-4">
          {address.city
            ? `Valgt: ${[address.postcode, address.city].filter(Boolean).join(" ")}${address.country ? `, ${address.country}` : ""}`
            : "Brugeren har ingen placering endnu."}
        </p>
      )}

      <LocationPicker
        coordinates={coordinates}
        setAddress={setAddress}
        setCoordinates={setCoordinates}
        initialQuery={adminMode ? address.city : ""}
        adminMode={adminMode}
      />

      <SaveButton
        onClick={onSave}
        saving={saving}
        disabled={!address.city}
      />
    </div>
  );
}
