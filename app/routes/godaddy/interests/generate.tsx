import { createFileRoute } from "@tanstack/react-router";
import { RoleProtectedRoute } from "../../../../src/components/RoleProtectedRoute";
import { AdminShell } from "../../../../src/components/AdminShell";
import { supabase } from "../../../../src/lib/supabase";
import { useState } from "react";
import { Button } from "../../../../src/components/ui/button";
import { Label } from "../../../../src/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { generateInterestsServerSide } from "../../api/generate-interests";
import { ErrorCard } from "@/components/form/ErrorCard";
import { SuccessCard } from "@/components/form/SuccessCard";

interface GeneratedInterest {
  interest_da: string;
  interest_en: string;
  category: string;
}

const GenerateInterests = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedInterests, setGeneratedInterests] = useState<GeneratedInterest[]>([]);

  // Form state
  const [category, setCategory] = useState("alle");
  const [targetAudience, setTargetAudience] = useState("voksne");
  const [interestCount, setInterestCount] = useState(10);

  const generateInterests = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // First, fetch all existing interests from the database
      const { data: existingInterests, error: fetchError } = await supabase.from("interests").select("interest_da");

      if (fetchError) {
        throw new Error(`Kunne ikke hente eksisterende interesser: ${fetchError.message}`);
      }

      // Extract the Danish names of existing interests
      const existingInterestNames = existingInterests?.map((interest) => interest.interest_da) || [];

      // Call the server-side API with existing interests to avoid duplicates
      const result = await generateInterestsServerSide(category, targetAudience, interestCount, existingInterestNames);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.interests && result.interests.length > 0) {
        setGeneratedInterests(result.interests);
        // setSuccess(`Genererede ${result.interests.length} interesser succesfuldt!`);
      } else {
        setError("Ingen interesser blev genereret");
      }
    } catch (err: unknown) {
      console.error("Error generating interests:", err);
      const errorMessage = err instanceof Error ? err.message : "Der opstod en fejl ved generering af interesser";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createInterestsInDatabase = async () => {
    if (generatedInterests.length === 0) {
      setError("Ingen interesser at oprette");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let createdCount = 0;
      const errors: string[] = [];
      const skippedCount = { count: 0 };

      // Instead of creating interests one by one, we can use a batch insert
      const insertData = generatedInterests.map((interest) => ({
        interest_da: interest.interest_da,
        interest_en: interest.interest_en,
        category: categories.find((cat) => cat.value === category)?.category_en || "",
      }));
      const { error: batchError } = await supabase.from("interests").insert(insertData).select();
      if (batchError) {
        throw batchError;
      }
      createdCount = insertData.length;
      // for (const interest of generatedInterests) {
      //   try {
      //     // Check if interest already exists
      //     const { data: existingInterest, error: checkError } = await supabase
      //       .from("interests")
      //       .select("interest_id")
      //       .eq("interest_da", interest.interest_da)
      //       .single();

      //     if (checkError && checkError.code !== "PGRST116") {
      //       throw checkError;
      //     }

      //     if (existingInterest) {
      //       console.log(`Interest "${interest.interest_da}" already exists, skipping`);
      //       skippedCount.count++;
      //       continue;
      //     }

      //     // Create the interest
      //     const { error: createError } = await supabase
      //       .from("interests")
      //       .insert({
      //         interest_da: interest.interest_da,
      //         interest_en: interest.interest_en,
      //       })
      //       .single();

      //     if (createError) throw createError;

      //     createdCount++;
      //   } catch (interestError) {
      //     console.error(`Error creating interest ${interest.interest_da}:`, interestError);
      //     errors.push(`${interest.interest_da}: ${interestError instanceof Error ? interestError.message : "Ukendt fejl"}`);
      //   }
      // }

      if (createdCount > 0) {
        let successMessage = `Oprettede ${createdCount} interesser i databasen succesfuldt!`;
        if (skippedCount.count > 0) {
          successMessage += ` (${skippedCount.count} blev sprunget over da de allerede eksisterer)`;
        }
        setSuccess(successMessage);
        setGeneratedInterests([]); // Clear generated interests after creation
      }

      if (errors.length > 0) {
        setError(`Nogle interesser kunne ikke oprettes:\n${errors.join("\n")}`);
      }
    } catch (err: unknown) {
      console.error("Error creating interests in database:", err);
      const errorMessage = err instanceof Error ? err.message : "Der opstod en fejl ved oprettelse af interesser i databasen";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: "alle", label: "Alle kategorier", category_en: "" },
    { value: "sport", label: "Sport", category_en: "sports" },
    { value: "kreativt", label: "Kreativt", category_en: "creative" },
    { value: "teknologi", label: "Teknologi", category_en: "technology" },
    { value: "udendørs", label: "Udendørs", category_en: "outdoors" },
    { value: "indendørs", label: "Indendørs", category_en: "indoors" },
    { value: "musik", label: "Musik", category_en: "music" },
    { value: "læring", label: "Læring", category_en: "learning" },
    { value: "madlavning", label: "Madlavning", category_en: "cooking" },
  ];

  return (
    <AdminShell title="Generer interesser" parentTo="/godaddy/interests">
      <div className="w-full">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-8">
            {error && <ErrorCard text={error} />}

            {success && <SuccessCard title="Succes!" text={success} />}

            {/* Generation Parameters */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Genereringsindstillinger</h3>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div>
                  <Label htmlFor="category">Kategori</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="audience">Målgruppe</Label>
                  <Select value={targetAudience} onValueChange={setTargetAudience}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="voksne">Voksne</SelectItem>
                      <SelectItem value="unge">Unge/Teenagere</SelectItem>
                      <SelectItem value="ældre">Ældre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="interestCount">Antal interesser</Label>
                  <Input
                    type="number"
                    id="interestCount"
                    min={1}
                    max={30}
                    value={interestCount}
                    onChange={(e) => setInterestCount(parseInt(e.target.value) || 10)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex space-x-4">
                <Button type="button" onClick={generateInterests} disabled={loading}>
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Genererer...
                    </>
                  ) : (
                    "Generer interesser"
                  )}
                </Button>

                {generatedInterests.length > 0 && (
                  <Button type="button" variant="outline" onClick={createInterestsInDatabase} disabled={loading}>
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        Opretter i database...
                      </>
                    ) : (
                      `Opret ${generatedInterests.length} interesser i database`
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Generated Interests Preview */}
            {generatedInterests.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Genererede interesser ({generatedInterests.length})</h3>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {generatedInterests.map((interest, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{interest.interest_da}</h4>
                            <p className=" text-gray-600">{interest.interest_en}</p>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {interest.category}
                          </span>
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

export const Route = createFileRoute("/godaddy/interests/generate")({
  component: () => (
    <RoleProtectedRoute requiredRole="admin">
      <GenerateInterests />
    </RoleProtectedRoute>
  ),
});
