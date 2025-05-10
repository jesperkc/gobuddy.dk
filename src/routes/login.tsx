import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LogIn } from "lucide-react";
import { SplitScreen } from "../components/SplitScreen";
import { supabase } from "../lib/supabase";
import { Button } from "@/components/ui/button";
import { email, minLength, required, useForm } from "@modular-forms/react";
import { TextInput } from "@/components/form/TextInput";

type LoginForm = {
  email: string;
  password: string;
};

export function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const [, { Form, Field }] = useForm<LoginForm>();

  const handleSubmit = async (values: LoginForm) => {
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setError(error.message);
    } else {
      navigate({ to: "/" });
    }
  };

  return (
    <SplitScreen>
      <div>
        <h1 className="text-2xl font-bold mb-6">Welcome Back!</h1>
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <Form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Field
              name="email"
              validate={[
                required("Please enter your email."),
                email("The email address is badly formatted."),
              ]}
            >
              {(field, props) => (
                <TextInput
                  {...props}
                  value={field.value}
                  error={field.error}
                  type="email"
                  label="Email"
                  placeholder="example@email.com"
                  required
                />
              )}
            </Field>
            <Field
              name="password"
              validate={[
                required("Please enter your password."),
                minLength(8, "Your password must have 8 characters or more."),
              ]}
            >
              {(field, props) => (
                <TextInput
                  {...props}
                  value={field.value}
                  error={field.error}
                  type="password"
                  label="Password"
                  placeholder="********"
                  required
                />
              )}
            </Field>
          </div>

          <Button type="submit" variant={"glow"} size={"xl"} className="w-full">
            Log ind
            <LogIn size={20} />
          </Button>
        </Form>
        <p className="mt-6 text-center text-gray-600">
          Har du ikke en konto?{" "}
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Opret en konto her
          </Link>
        </p>
      </div>
    </SplitScreen>
  );
}
