import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SplitScreen } from "../components/SplitScreen";
import { useOnboardingStore } from "../store/onboarding";
import { required, useForm } from "@modular-forms/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TextInput } from "@/components/form/TextInput";

type DetailsForm = {
  name: string;
  age: number;
};

export function Details() {
  const navigate = useNavigate();
  const { name, age, setName, setAge } = useOnboardingStore();

  const [detailsForm, { Form, Field }] = useForm<DetailsForm>({
    // validate: zodForm(detailsSchema),
    initialValues: {
      name: name,
      age: age || undefined,
    },
  });

  const handleSubmit = (values: DetailsForm) => {
    setName(values.name);
    setAge(values.age);
    navigate({ to: "/interests" });
  };

  return (
    <SplitScreen>
      <div>
        <h1 className="text-2xl font-bold mb-6">Fortæl os mere om dig</h1>
        <Form onSubmit={handleSubmit} className="space-y-6">
          <Field name="name" validate={[required("Indtast venligst et navn")]}>
            {(field, props) => (
              <TextInput
                {...props}
                value={field.value}
                error={field.error}
                type="email"
                label="Hvad er dit navn?"
                placeholder="Indtast et navn"
                required
              />
            )}
          </Field>

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
                label="Hvad er din alder?"
                placeholder="Indtast din alder"
                required
              />
            )}
          </Field>

          <div className="flex justify-end">
            <Button
              type="button"
              variant={"secondary"}
              onClick={() => navigate({ to: "/" })}
            >
              Tilbage
            </Button>
            <Button type="submit" className="ml-auto">
              Videre
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Form>
      </div>
    </SplitScreen>
  );
}
