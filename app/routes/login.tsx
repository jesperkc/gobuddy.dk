import { createFileRoute } from "@tanstack/react-router";
import { PageTitle } from "@/components/PageTitle";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { SplitScreen } from "../../src/components/SplitScreen";
import { ErrorBanner } from "@/components/ErrorBanner";
import { supabase } from "../../src/lib/supabase";
import { Button } from "../../src/components/ui/button";
import { email, minLength, required, useForm } from "@modular-forms/react";
import { TextInput } from "../../src/components/form/TextInput";

type LoginForm = {
  email: string;
  password: string;
};

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) return "Forkert email eller adgangskode";
  if (message.includes("Email not confirmed")) return "Din email er ikke bekræftet. Tjek din indbakke.";
  if (message.includes("Too many requests")) return "For mange forsøg. Prøv igen om lidt.";
  return "Der opstod en fejl. Prøv igen.";
}

function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [, { Form, Field }] = useForm<LoginForm>();

  const handleSubmit = async (values: LoginForm) => {
    setError("");
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        setError(translateAuthError(error.message));
      } else {
        navigate({ to: "/" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SplitScreen>
      <div>
        <PageTitle>Velkommen tilbage!</PageTitle>
        <ErrorBanner message={error} />

        <Form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Field name="email" validate={[required("Indtast venligst din email."), email("Emailadressen er ikke gyldig.")]}>
              {(field, props) => (
                <TextInput
                  {...props}
                  value={field.value}
                  error={field.error}
                  type="email"
                  label="Email"
                  placeholder="eksempel@email.dk"
                  required
                />
              )}
            </Field>
            <Field
              name="password"
              validate={[required("Indtast venligst din adgangskode."), minLength(8, "Din adgangskode skal have mindst 8 tegn.")]}
            >
              {(field, props) => (
                <TextInput
                  {...props}
                  value={field.value}
                  error={field.error}
                  type="password"
                  label="Adgangskode"
                  placeholder="********"
                  required
                />
              )}
            </Field>
          </div>

          <div className="text-right">
            <Link to="/forgot-password" className="text-sm text-blue-700 hover:text-blue-900">
              Glemt adgangskode?
            </Link>
          </div>

          <Button type="submit" variant={"glow"} size={"xl"} className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                Logger ind...
                <Loader2 size={20} className="animate-spin" />
              </>
            ) : (
              <>
                Log ind
                <LogIn size={20} />
              </>
            )}
          </Button>
        </Form>
        <p className="mt-6 text-center text-gray-600">
          Har du ikke en konto?{" "}
          <Link to="/" className="text-blue-700 hover:text-blue-900 font-medium">
            Opret en konto her
          </Link>
        </p>
      </div>
    </SplitScreen>
  );
}

export const Route = createFileRoute("/login")({
  component: Login,
});
