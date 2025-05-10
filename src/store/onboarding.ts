import { create } from "zustand";

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
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  email: "",
  password: "",
  name: "",
  age: 0,
  interests: [],
  address: {
    postcode: "",
    city: "",
    country: "",
    country_code: "",
  },
  coordinates: undefined,
  newsletter: false,
  setEmail: (email) => set({ email }),
  setPassword: (password) => set({ password }),
  setName: (name) => set({ name }),
  setAge: (age) => set({ age }),
  setInterests: (interests) => set({ interests }),
  setAddress: (address) => set({ address }),
  setCoordinates: (coordinates) => set({ coordinates }),
  setNewsletter: (newsletter) => set({ newsletter }),
}));
