import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AuthProvider } from "../../src/contexts/AuthContext";
import { ChatPopup } from "../../src/components/ChatPopup";
import { Toaster } from "sonner";
import { useClientEffect } from "../../src/lib/ssr-utils";
import { rehydrateOnboardingStore } from "../../src/store/onboarding";

function RootComponent() {
  useClientEffect(() => {
    rehydrateOnboardingStore();
  }, []);

  return (
    <AuthProvider>
      <Outlet />
      <ChatPopup />
      <Toaster position="top-right" richColors closeButton />
    </AuthProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
