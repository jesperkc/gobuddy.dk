import { required, useForm } from "@modular-forms/react";
import { TextInput } from "@/components/form/TextInput";
import { SaveButton } from "./SaveButton";
import type { DetailsFormValues } from "./types";

interface DetailsTabPanelProps {
  initialValues: {
    first_name: string;
    last_name?: string;
    age: number | undefined;
  };
  onSave: (values: DetailsFormValues) => void;
  saving: boolean;
  showLastName?: boolean;
  children?: React.ReactNode;
}

export function DetailsTabPanel({
  initialValues,
  onSave,
  saving,
  showLastName = false,
  children,
}: DetailsTabPanelProps) {
  const [, { Form, Field }] = useForm<DetailsFormValues>({
    initialValues: {
      first_name: initialValues.first_name || "",
      last_name: initialValues.last_name || "",
      age: initialValues.age,
    },
  });

  return (
    <div className="space-y-8">
      {children}

      <div>
        <h2 className="text-2xl font-bold mb-6">Personlige oplysninger</h2>
        <Form onSubmit={onSave} className="space-y-6">
          <div
            className={`grid grid-cols-1 gap-6 ${showLastName ? "sm:grid-cols-2" : ""}`}
          >
            <Field
              name="first_name"
              validate={[required("Indtast venligst et navn")]}
            >
              {(field, props) => (
                <TextInput
                  {...props}
                  value={field.value}
                  error={field.error}
                  type="text"
                  label={showLastName ? "Fornavn" : "Hvad er dit navn?"}
                  placeholder={
                    showLastName ? "Indtast fornavn" : "Indtast et navn"
                  }
                  required
                />
              )}
            </Field>
            {showLastName && (
              <Field
                name="last_name"
                validate={[required("Indtast venligst et efternavn")]}
              >
                {(field, props) => (
                  <TextInput
                    {...props}
                    value={field.value}
                    error={field.error}
                    type="text"
                    label="Efternavn"
                    placeholder="Indtast efternavn"
                    required
                  />
                )}
              </Field>
            )}
          </div>

          <Field
            name="age"
            type="number"
            validate={[required("Indtast venligst din alder")]}
          >
            {(field, props) => (
              <TextInput
                {...props}
                value={field.value}
                error={field.error}
                type="number"
                label={showLastName ? "Alder" : "Hvad er din alder?"}
                placeholder="Indtast din alder"
                required
              />
            )}
          </Field>

          <SaveButton type="submit" saving={saving} />
        </Form>
      </div>
    </div>
  );
}
