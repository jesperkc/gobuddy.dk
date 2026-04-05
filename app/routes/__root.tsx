import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AuthProvider } from "../../src/contexts/AuthContext";
import { ChatPopup } from "../../src/components/ChatPopup";
import { Toaster } from "sonner";

export const Route = createRootRoute({
  component: () => (
    <AuthProvider>
      <Outlet />
      <ChatPopup />
      <Toaster position="top-right" richColors closeButton />
    </AuthProvider>
  ),
});
