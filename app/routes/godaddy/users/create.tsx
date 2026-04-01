import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RoleProtectedRoute } from "../../../../src/components/RoleProtectedRoute";
import { AdminShell } from "../../../../src/components/AdminShell";
import { supabase } from "../../../../src/lib/supabase";
import { useState } from "react";
import { Button } from "../../../../src/components/ui/button";
import { Label } from "../../../../src/components/ui/label";
import { TextInput } from "../../../../src/components/form/TextInput";
import { useForm, required, minLength, email } from "@modular-forms/react";
import { InterestsPicker } from "../../../../src/components/InterestsPicker";
import { LocationPicker, IAddress } from "../../../../src/components/LocationPicker";
import type { Database } from "../../../../database.types";
import { ErrorCard } from "@/components/form/ErrorCard";
import { SuccessCard } from "@/components/form/SuccessCard";

type UserRole = Database["public"]["Enums"]["app_role"];

interface CreateUserForm extends Record<string, string | number | undefined> {
  firstName: string;
  lastName: string;
  email: string;
  age: number | undefined;
  password: string;
}

const CreateUser = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form setup with useForm
  const [, { Form, Field }] = useForm<CreateUserForm>({
    initialValues: {
      firstName: "",
      lastName: "",
      email: "",
      age: undefined,
      password: "",
    },
  });

  // Location state
  const [address, setAddress] = useState<IAddress>({
    postcode: "",
    city: "",
    country: "",
    country_code: "",
  });
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | undefined>();

  // Interests state
  const [selectedInterests, setSelectedInterests] = useState<Record<string, string>>({});

  // Non-form state for complex inputs
  const [role, setRole] = useState<UserRole | undefined>(undefined);
  const [newsletter, setNewsletter] = useState(false);
  const [bio, setBio] = useState("");

  const toggleInterest = (interestId: string) => {
    setSelectedInterests((prev) => {
      const newInterests = { ...prev };
      if (interestId in newInterests) {
        delete newInterests[interestId];
      } else {
        newInterests[interestId] = "";
      }
      return newInterests;
    });
  };

  const removeInterest = (interestId: string) => {
    setSelectedInterests((prev) => {
      const newInterests = { ...prev };
      delete newInterests[interestId];
      return newInterests;
    });
  };

  const updateInterestDescription = (interestId: string, description: string) => {
    setSelectedInterests((prev) => ({
      ...prev,
      [interestId]: description,
    }));
  };

  // Additional validation for non-form fields
  const validateAdditionalFields = (): string | null => {
    if (!address.city) return "Lokation er påkrævet";
    return null;
  };

  const handleSubmit = async (values: CreateUserForm) => {
    const additionalValidation = validateAdditionalFields();
    if (additionalValidation) {
      setError(additionalValidation);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: values.email,
        password: values.password,
        email_confirm: true,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      const userId = authData.user.id;

      // 2. Create profile record
      const profileData = {
        profile_id: userId,
        email: values.email,
        first_name: values.firstName,
        last_name: values.lastName,
        age: values.age || null,
        bio: bio || null,
        city: address.city,
        country: address.country,
        country_code: address.country_code,
        postcode: address.postcode,
        latitude: coordinates?.lat || null,
        longitude: coordinates?.lng || null,
        newsletter: newsletter,
      };

      const { data: profile, error: profileError } = await supabase.from("profiles").insert(profileData).select().single();

      if (profileError) throw profileError;

      // 3. Add interests if selected
      if (Object.keys(selectedInterests).length > 0) {
        const interestInserts = Object.entries(selectedInterests).map(([interestId, description]) => ({
          profile_id: profile.profile_id,
          interest_id: interestId,
          description: description || "",
        }));

        const { error: interestsError } = await supabase.from("user_interests").insert(interestInserts);

        if (interestsError) throw interestsError;
      }

      // 4. Assign role if specified
      if (role) {
        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: userId,
          role: role,
        });

        if (roleError) throw roleError;
      }

      setSuccess(true);
      // setTimeout(() => {
      //   navigate({ to: "/godaddy/users" });
      // }, 2000);
    } catch (err: unknown) {
      console.error("Error creating user:", err);
      const errorMessage = err instanceof Error ? err.message : "Der opstod en fejl ved oprettelse af brugeren";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <RoleProtectedRoute requiredRole="admin">
        <AdminShell title="Opret ny bruger">
          <SuccessCard title="Bruger oprettet!" text="Brugeren er blevet oprettet succesfuldt." />
        </AdminShell>
      </RoleProtectedRoute>
    );
  }

  return (
    <AdminShell title="Opret ny bruger" crumbs={[{ label: "Brugere", href: "/godaddy/users" }, { label: `Opret bruger` }]}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <Form onSubmit={handleSubmit} className="space-y-8">
            {error && <ErrorCard text={error} />}

            {/* Basic Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Grundlæggende information</h3>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <Field name="firstName" validate={[required("Fornavn er påkrævet")]}>
                  {(field, props) => (
                    <TextInput
                      {...props}
                      value={field.value}
                      error={field.error}
                      type="text"
                      label="Fornavn *"
                      placeholder="Indtast fornavn"
                      required
                    />
                  )}
                </Field>

                <Field name="lastName" validate={[required("Efternavn er påkrævet")]}>
                  {(field, props) => (
                    <TextInput
                      {...props}
                      value={field.value}
                      error={field.error}
                      type="text"
                      label="Efternavn *"
                      placeholder="Indtast efternavn"
                      required
                    />
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <Field name="email" validate={[required("Email er påkrævet"), email("Ugyldig email adresse")]}>
                  {(field, props) => (
                    <TextInput
                      {...props}
                      value={field.value}
                      error={field.error}
                      type="email"
                      label="Email *"
                      placeholder="Indtast email"
                      required
                    />
                  )}
                </Field>

                <Field name="age" type="number">
                  {(field, props) => (
                    <TextInput {...props} value={field.value} error={field.error} type="number" label="Alder" placeholder="Indtast alder" />
                  )}
                </Field>
              </div>

              <Field name="password" validate={[required("Adgangskode er påkrævet"), minLength(6, "Adgangskode skal være mindst 6 tegn")]}>
                {(field, props) => (
                  <div>
                    <TextInput
                      {...props}
                      value={field.value}
                      error={field.error}
                      type="password"
                      label="Midlertidig adgangskode *"
                      placeholder="Indtast adgangskode"
                      required
                    />
                    <p className="mt-1  text-gray-500">Mindst 6 tegn. Brugeren kan ændre dette efter første login.</p>
                  </div>
                )}
              </Field>

              <div>
                <Label htmlFor="bio">Bio (valgfrit)</Label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBio(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  maxLength={500}
                />
                <p className="mt-1  text-gray-500">{bio.length}/500 tegn</p>
              </div>
            </div>

            {/* Location Selection */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Lokation *</h3>
              <LocationPicker coordinates={coordinates} setAddress={setAddress} setCoordinates={setCoordinates} />
            </div>

            {/* Interests Selection */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Interesser (valgfrit)</h3>
              <InterestsPicker
                selectedInterestsWithDescriptions={selectedInterests}
                toggleInterest={toggleInterest}
                removeInterest={removeInterest}
                updateInterestDescription={updateInterestDescription}
              />
            </div>

            {/* Role Assignment */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Rolle (valgfrit)</h3>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value=""
                    checked={!role}
                    onChange={() => setRole(undefined)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2  text-gray-700">Almindelig bruger</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="moderator"
                    checked={role === "moderator"}
                    onChange={() => setRole("moderator")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2  text-gray-700">Moderator</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={role === "admin"}
                    onChange={() => setRole("admin")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2  text-gray-700">Administrator</span>
                </label>
              </div>
            </div>

            {/* Newsletter Subscription */}
            <div className="space-y-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newsletter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewsletter(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2  text-gray-700">Tilmeld nyhedsbrev</span>
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex justify-between pt-6 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/godaddy/users" })} disabled={loading}>
                Annuller
              </Button>

              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Opretter bruger...
                  </>
                ) : (
                  "Opret bruger"
                )}
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </AdminShell>
  );
};

export const Route = createFileRoute("/godaddy/users/create")({
  component: CreateUser,
});
