import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RoleProtectedRoute } from "../../../src/components/RoleProtectedRoute";

const AdminRoute = () => {
  return (
    <RoleProtectedRoute requiredRole="admin">
      <Outlet />
    </RoleProtectedRoute>
  );
};

export const Route = createFileRoute("/godaddy")({
  component: AdminRoute,
});
