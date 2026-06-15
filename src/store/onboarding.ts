import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeLocalStorage } from "../lib/ssr-utils";

interface IAddress {
  postcode: string;
  city: string;
  country: string;
  country_code: string;
}

interface OnboardingState {
  email: string;
  password: string;
  name: string;
  age: number;
  interests: string[];
  address: IAddress;
  coordinates?: { lat: number; lng: number };
  newsletter: boolean;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setName: (name: string) => void;
  setAge: (age: number) => void;
  setInterests: (interests: string[]) => void;
  setAddress: (location: IAddress) => void;
  setCoordinates: (coordinates: { lat: number; lng: number }) => void;
  setNewsletter: (newsletter: boolean) => void;
  reset: () => void;
}

const initialState = {
  email: "",
  password: "",
  name: "",
  age: 0,
  interests: [] as string[],
  address: {
    postcode: "",
    city: "",
    country: "",
    country_code: "",
  },
  coordinates: undefined,
  newsletter: false,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,
      setEmail: (email) => set({ email }),
      setPassword: (password) => set({ password }),
      setName: (name) => set({ name }),
      setAge: (age) => set({ age }),
      setInterests: (interests) => set({ interests }),
      setAddress: (address) => set({ address }),
      setCoordinates: (coordinates) => set({ coordinates }),
      setNewsletter: (newsletter) => set({ newsletter }),
      reset: () => set({ ...initialState }),
    }),
    {
      name: "gobuddy-onboarding",
      storage: createJSONStorage(() => safeLocalStorage),
      // Don't render persisted state during SSR/first paint — rehydrate on the
      // client instead (see rehydrateOnboardingStore) to avoid hydration mismatch.
      skipHydration: true,
      // Never persist the password to disk; it's only entered on the final step.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      partialize: ({ password, ...rest }) => rest,
    }
  )
);

/**
 * Rehydrate the onboarding store from localStorage. Call once on the client
 * after mount so the server-rendered HTML (default state) matches the first
 * client render before persisted values are applied.
 */
export const rehydrateOnboardingStore = () => useOnboardingStore.persist.rehydrate();
