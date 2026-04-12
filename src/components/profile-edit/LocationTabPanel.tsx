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
}

export function LocationTabPanel({
  coordinates,
  address,
  setAddress,
  setCoordinates,
  onSave,
  saving,
}: LocationTabPanelProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Placering</h2>

      <LocationPicker
        coordinates={coordinates}
        setAddress={setAddress}
        setCoordinates={setCoordinates}
      />

      <SaveButton
        onClick={onSave}
        saving={saving}
        disabled={!address.city}
      />
    </div>
  );
}
