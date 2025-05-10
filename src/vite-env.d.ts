/// <reference types="vite/client" />

// We can't import types in .d.ts files, so we need to redeclare the Window interface
// with the same structure as IsignupObject
interface Window {
  __TEST_SIGNUP_OBJECT__?: {
    email: string;
    password: string;
    options: {
      data: {
        first_name: string;
        age: number;
        coordinates: string | null;
        postcode: string;
        city: string;
        country: string;
        country_code: string;
        longitude?: number;
        latitude?: number;
        interests: string[];
        newsletter: boolean;
      };
      emailRedirectTo: string;
    };
  };
}
