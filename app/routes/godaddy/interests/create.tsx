import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RoleProtectedRoute } from "../../../../src/components/RoleProtectedRoute";
import { AdminShell } from "../../../../src/components/AdminShell";
import { supabase } from "../../../../src/lib/supabase";
import { useState } from "react";
import { Button } from "../../../../src/components/ui/button";
import { TextInput } from "../../../../src/components/form/TextInput";
import { useForm, required } from "@modular-forms/react";
import { SuccessCard } from "@/components/form/SuccessCard";
import { ErrorCard } from "@/components/form/ErrorCard";

interface CreateInterestForm extends Record<string, string | undefined> {
  interestDa: string;
  interestEn: string;
}

const CreateInterest = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>();
  const [success, setSuccess] = useState(false);

  // Form setup with useForm
  const [, { Form, Field }] = useForm<CreateInterestForm>({
    initialValues: {
      interestDa: "",
      interestEn: "",
    },
  });

  const handleSubmit = async (values: CreateInterestForm) => {
    setLoading(true);
    setError(null);

    try {
      // Check if interest already exists (Danish version)
      const { data: existingInterest, error: checkError } = await supabase
        .from("interests")
        .select("interest_id")
        .eq("interest_da", values.interestDa)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      if (existingInterest) {
        setError("En interesse med dette danske navn eksisterer allerede");
        return;
      }

      // Create the new interest
      const { error: createError } = await supabase
        .from("interests")
        .insert({
          interest_da: values.interestDa,
          interest_en: values.interestEn || values.interestDa, // Use Danish as fallback if English not provided
        })
        .select()
        .single();

      if (createError) throw createError;

      setSuccess(true);
      setTimeout(() => {
        navigate({ to: "/godaddy/interests" });
      }, 2000);
    } catch (err: unknown) {
      console.error("Error creating interest:", err);
      const errorMessage = err instanceof Error ? err.message : "Der opstod en fejl ved oprettelse af interessen";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <RoleProtectedRoute requiredRole="admin">
        <AdminShell title="Opret ny interesse">
          <SuccessCard
            title="Interesse oprettet!"
            text="Den nye interesse er blevet oprettet succesfuldt. Du omdirigeres til interesselisten..."
          />
        </AdminShell>
      </RoleProtectedRoute>
    );
  }

  return (
    <AdminShell title="Opret ny interesse">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <Form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="max-w-2xl mx-auto">
                <ErrorCard text={error} />
              </div>
            )}

            {/* Interest Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Interesseoplysninger</h3>
              <p className=" text-gray-600">
                Opret en ny interesse som brugere kan vælge fra. Både danske og engelske navne er nyttige for søgning og kategorisering.
              </p>

              <Field name="interestDa" validate={[required("Dansk interessenavn er påkrævet")]}>
                {(field, props) => (
                  <TextInput
                    {...props}
                    value={field.value}
                    error={field.error}
                    type="text"
                    label="Dansk interessenavn *"
                    placeholder="F.eks. Fodbold, Læsning, Madlavning"
                    required
                  />
                )}
              </Field>

              <Field name="interestEn">
                {(field, props) => (
                  <div>
                    <TextInput
                      {...props}
                      value={field.value}
                      error={field.error}
                      type="text"
                      label="Engelsk interessenavn (valgfrit)"
                      placeholder="F.eks. Football, Reading, Cooking"
                    />
                    <p className="mt-1  text-gray-500">Hvis ikke angivet, vil det danske navn blive brugt som engelsk navn også.</p>
                  </div>
                )}
              </Field>
            </div>

            {/* Examples section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className=" font-medium text-blue-800 mb-2">💡 Eksempler på populære interesser:</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                <div>
                  <p>
                    <strong>Sport:</strong> Fodbold, Tennis, Løb, Svømning
                  </p>
                  <p>
                    <strong>Kreativt:</strong> Maleri, Musik, Fotografering
                  </p>
                  <p>
                    <strong>Indendørs:</strong> Læsning, Gaming, Madlavning
                  </p>
                </div>
                <div>
                  <p>
                    <strong>Udendørs:</strong> Vandreture, Cykling, Camping
                  </p>
                  <p>
                    <strong>Socialt:</strong> Koncerter, Café besøg, Film
                  </p>
                  <p>
                    <strong>Læring:</strong> Sprog, Programmering, Historie
                  </p>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-between pt-6 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/godaddy/interests" })} disabled={loading}>
                Annuller
              </Button>

              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Opretter interesse...
                  </>
                ) : (
                  "Opret interesse"
                )}
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </AdminShell>
  );
};

export const Route = createFileRoute("/godaddy/interests/create")({
  component: () => (
    <RoleProtectedRoute requiredRole="admin">
      <CreateInterest />
    </RoleProtectedRoute>
  ),
});
