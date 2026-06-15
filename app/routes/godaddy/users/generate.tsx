import { createFileRoute } from "@tanstack/react-router";
import { RoleProtectedRoute } from "../../../../src/components/RoleProtectedRoute";
import { AdminShell } from "../../../../src/components/AdminShell";
import { supabase } from "../../../../src/lib/supabase";
import { useState } from "react";
import { Button } from "../../../../src/components/ui/button";
import { Label } from "../../../../src/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { generateUsersServerSide } from "../../api/generate-users";
import { ErrorCard } from "@/components/form/ErrorCard";
import { SuccessCard } from "@/components/form/SuccessCard";

export interface GeneratedUser {
  first_name: string;
  age: number;
  bio: string;
  location: {
    road: string;
    house_number: string;
    postcode: string;
    city: string;
    country: string;
    country_code: string;
    latitude: number;
    longitude: number;
  };
  interests: Array<{
    interest_id: string;
    interest_da: string;
    description: string;
  }>;
}

const GenerateUsers = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedUsers, setGeneratedUsers] = useState<GeneratedUser[]>([]);

  // Form state
  const [gender, setGender] = useState<"mand" | "kvinde">("mand");
  const [city, setCity] = useState("København");
  const [userCount, setUserCount] = useState(1);

  const generateUsers = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Call server-side function (client-side with server capabilities)
      const result = await generateUsersServerSide(gender, city, userCount);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.users) {
        setGeneratedUsers(result.users);
        setSuccess(`Genererede ${result.users.length} bruger(e) succesfuldt!`);
      }
    } catch (err: unknown) {
      console.error("Error generating users:", err);
      const errorMessage = err instanceof Error ? err.message : "Der opstod en fejl ved generering af brugere";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createUsersInDatabase = async () => {
    if (generatedUsers.length === 0) {
      setError("Ingen brugere at oprette");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let createdCount = 0;
      const errors: string[] = [];

      for (const user of generatedUsers) {
        try {
          const email = `${user.first_name.toLowerCase()}${user.age}${Math.floor(Math.random() * 1000)}@gobuddy.com`;
          const tempPassword = `temp${Math.random().toString(36).substring(2, 10)}`;

          // Use admin-create-user edge function to skip email confirmation (avoids rate limits)
          const { data: authData, error: authError } = await supabase.functions.invoke<{
            user_id?: string;
            error?: string;
          }>("admin-create-user", {
            body: {
              email,
              password: tempPassword,
              email_confirm: true,
              user_metadata: {
                first_name: user.first_name,
                age: user.age,
                coordinates: user.location.latitude ? `POINT(${user.location.latitude} ${user.location.longitude})` : null,
                postcode: user.location.postcode,
                city: user.location.city,
                country: user.location.country,
                country_code: user.location.country_code,
                interests: user.interests.map((i) => ({
                  interest_id: i.interest_id,
                  description: i.description,
                })),
                newsletter: false,
              },
            },
          });

          if (authError) throw authError;
          if (!authData?.user_id) throw new Error(authData?.error ?? "Failed to create user");
          const newUserId = authData.user_id;

          // 3. Add interests
          if (user.interests.length > 0) {
            // First, get or create interest records
            const interestInserts = [];

            for (const userInterest of user.interests) {
              // Check if interest exists, if not create it
              const { data: existingInterest, error: checkError } = await supabase
                .from("interests")
                .select("interest_id")
                .eq("interest_da", userInterest.interest_da)
                .single();

              let interestId: string;

              if (checkError || !existingInterest) {
                // Create new interest
                const { data: newInterest, error: createInterestError } = await supabase
                  .from("interests")
                  .insert({
                    interest_da: userInterest.interest_da,
                    interest_en: userInterest.interest_da, // Using Danish as English for now
                  })
                  .select("interest_id")
                  .single();

                if (createInterestError || !newInterest) {
                  console.warn(`Could not create interest: ${userInterest.interest_da}`);
                  continue;
                }
                interestId = newInterest.interest_id;
              } else {
                interestId = existingInterest.interest_id;
              }

              interestInserts.push({
                profile_id: newUserId,
                interest_id: interestId,
                description: userInterest.description,
              });
            }

            // if (interestInserts.length > 0) {
            //   const { error: interestsError } = await supabase.from("user_interests").upsert(interestInserts);

            //   if (interestsError) {
            //     console.warn(`Could not add interests for user ${user.first_name}:`, interestsError);
            //   }
            // }
          }

          createdCount++;
        } catch (userError) {
          console.error(`Error creating user ${user.first_name}:`, userError);
          errors.push(`${user.first_name}: ${userError instanceof Error ? userError.message : "Ukendt fejl"}`);
        }
      }

      if (createdCount > 0) {
        setSuccess(`Oprettede ${createdCount} bruger(e) i databasen succesfuldt!`);
        setGeneratedUsers([]); // Clear generated users after creation
      }

      if (errors.length > 0) {
        setError(`Nogle brugere kunne ikke oprettes:\n${errors.join("\n")}`);
      }
    } catch (err: unknown) {
      console.error("Error creating users in database:", err);
      const errorMessage = err instanceof Error ? err.message : "Der opstod en fejl ved oprettelse af brugere i databasen";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminShell title="Generer falske brugere" crumbs={[{ label: "Brugere", href: "/godaddy/users" }, { label: `Generer brugere` }]}>
      <div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-8">
            {error && <ErrorCard text={error} />}

            {success && <SuccessCard title="Succes!" text={success} />}

            {/* Generation Parameters */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Genereringsindstillinger</h3>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div>
                  <Label htmlFor="gender">Køn</Label>
                  <Select value={gender} onValueChange={(value) => setGender(value as "mand" | "kvinde")}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mand">Mand</SelectItem>
                      <SelectItem value="kvinde">Kvinde</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="city">By</Label>
                  <Input
                    type="text"
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1"
                    placeholder="F.eks. København"
                  />
                </div>

                <div>
                  <Label htmlFor="userCount">Antal brugere</Label>
                  <Input
                    type="number"
                    id="userCount"
                    min={1}
                    max={10}
                    value={userCount}
                    onChange={(e) => setUserCount(parseInt(e.target.value) || 1)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex space-x-4">
                <Button type="button" onClick={generateUsers} disabled={loading}>
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Genererer...
                    </>
                  ) : (
                    "Generer brugere"
                  )}
                </Button>

                {generatedUsers.length > 0 && (
                  <Button type="button" variant="outline" onClick={createUsersInDatabase} disabled={loading}>
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        Opretter i database...
                      </>
                    ) : (
                      `Opret ${generatedUsers.length} bruger(e) i database`
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Generated Users Preview */}
            {generatedUsers.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Genererede brugere ({generatedUsers.length})</h3>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {generatedUsers.map((user, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-gray-900">{user.first_name}</h4>
                          <span className="text-gray-500">({user.age} år)</span>
                          <span className="text-gray-500">{user.bio}</span>
                        </div>

                        <div className=" text-gray-600">
                          <p>
                            📍 {user.location.road} {user.location.house_number}
                          </p>
                          <p>
                            {user.location.postcode} {user.location.city}, {user.location.country}
                          </p>
                          <p>
                            Koordinater: {user.location.latitude}, {user.location.longitude}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <h5 className="font-medium text-gray-800">Interesser:</h5>
                          {user.interests.map((interest, idx) => (
                            <div key={idx} className="bg-gray-50 rounded p-2">
                              <p className="font-medium ">{interest.interest_da}</p>
                              <p className="text-xs text-gray-600">{interest.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
};

export const Route = createFileRoute("/godaddy/users/generate")({
  component: () => (
    <RoleProtectedRoute requiredRole="admin">
      <GenerateUsers />
    </RoleProtectedRoute>
  ),
});
