export interface UserProfile {
  profile_id: string;
  first_name: string | null;
  last_name?: string | null;
  age: number | null;
  email: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  postcode: string | null;
  country: string | null;
  country_code: string | null;
  avatar_url?: string | null;
  created_at: string | null;
}

export type DetailsFormValues = {
  first_name: string;
  last_name: string;
  age: number | undefined;
};

export interface ProfileTab {
  id: string;
  label: string;
}
