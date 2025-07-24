import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AuthProvider } from "../../src/contexts/AuthContext";

export const Route = createRootRoute({
  component: () => (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  ),
});
