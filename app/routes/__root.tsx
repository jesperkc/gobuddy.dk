import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AuthProvider } from "../../src/contexts/AuthContext";
import { ChatPopup } from "../../src/components/ChatPopup";
import { Toaster } from "sonner";
import { EmailVerificationDialog } from "../../src/components/EmailVerification";
import { useClientEffect } from "../../src/lib/ssr-utils";
import { rehydrateOnboardingStore } from "../../src/store/onboarding";
import { rehydrateFirstPostsStore } from "../../src/store/firstPosts";

function RootComponent() {
  useClientEffect(() => {
    rehydrateOnboardingStore();
    rehydrateFirstPostsStore();
  }, []);

  return (
    <AuthProvider>
      <Outlet />
      <ChatPopup />
      <EmailVerificationDialog />
      <Toaster position="top-right" richColors closeButton />
    </AuthProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
