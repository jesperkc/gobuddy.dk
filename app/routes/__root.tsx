import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AuthProvider } from "../../src/contexts/AuthContext";
import { ChatPopup } from "../../src/components/ChatPopup";

export const Route = createRootRoute({
  component: () => (
    <AuthProvider>
      <Outlet />
      <ChatPopup />
    </AuthProvider>
  ),
});
