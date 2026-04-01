import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DefaultLayout } from "../../src/components/AppShell";
import { useClientEffect } from "../../src/lib/ssr-utils";

function Complete() {
  const navigate = useNavigate();

  useClientEffect(() => {
    // User lands here after clicking the email confirmation link.
    // Supabase handles the token exchange automatically via the URL hash.
    // Redirect to home after a short delay to let the auth state update.
    const timeout = setTimeout(() => {
      navigate({ to: "/home" });
    }, 1000);

    return () => clearTimeout(timeout);
  }, [navigate]);

  return (
    <DefaultLayout>
      <div className="max-w-md mx-auto text-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          <p className="text-gray-600">Email bekræftet — sender dig videre...</p>
        </div>
      </div>
    </DefaultLayout>
  );
}

export const Route = createFileRoute("/complete")({
  component: Complete,
});
