import { createFileRoute } from "@tanstack/react-router";
import { PageTitle } from "@/components/PageTitle";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SplitScreen } from "../../src/components/SplitScreen";
import { useOnboardingStore } from "../../src/store/onboarding";
import { required, reset, useForm } from "@modular-forms/react";
import { Button } from "../../src/components/ui/button";
import { TextInput } from "../../src/components/form/TextInput";
import { UnauthedRoute } from "@/components/UnauthedRoute";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { useClientEffect } from "../../src/lib/ssr-utils";

type DetailsForm = {
  name: string;
  age: number;
};

function Details() {
  const navigate = useNavigate();
  const { name, age, setName, setAge } = useOnboardingStore();

  const [detailsForm, { Form, Field }] = useForm<DetailsForm>({
    // validate: zodForm(detailsSchema),
    initialValues: {
      name: name,
      age: age || undefined,
    },
  });

  // The store rehydrates from localStorage after mount, so the form's snapshot
  // initialValues miss it. Push restored values into the form once they arrive,
  // without clobbering anything the user has already started typing.
  useClientEffect(() => {
    if (name || age) {
      reset(detailsForm, { initialValues: { name, age: age || undefined }, keepDirtyValues: true });
    }
  }, [name, age]);

  const handleSubmit = (values: DetailsForm) => {
    setName(values.name);
    setAge(values.age);
    navigate({ to: "/interests" });
  };

  return (
    <SplitScreen illustration="cyclist" tagline="Lad os lære dig at kende — det tager kun et par minutter.">
      <div>
        <OnboardingStepper step={1} />
        <PageTitle className="text-3xl tracking-tight">Fortæl os mere om dig</PageTitle>
        <Form onSubmit={handleSubmit} className="space-y-6">
          <Field name="name" validate={[required("Indtast venligst et navn")]}>
            {(field, props) => (
              <TextInput
                {...props}
                value={field.value}
                error={field.error}
                type="text"
                id="details-name"
                label="Hvad er dit navn?"
                placeholder="Indtast et navn"
                required
              />
            )}
          </Field>

          <Field name="age" type="number" validate={[required("Indtast venligst din alder")]}>
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

          <div className="flex items-center justify-between">
            <Button type="button" variant="ghost" className="rounded-full" onClick={() => navigate({ to: "/" })}>
              Tilbage
            </Button>
            <Button type="submit" className="rounded-full bg-gray-900 hover:bg-gray-800 px-6">
              Videre
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Form>
      </div>
    </SplitScreen>
  );
}

function UnauthedPage() {
  return (
    <UnauthedRoute>
      <Details />
    </UnauthedRoute>
  );
}

export const Route = createFileRoute("/details")({
  component: UnauthedPage,
});
