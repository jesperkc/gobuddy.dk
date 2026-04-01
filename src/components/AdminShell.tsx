import React, { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "./ui/button";
import { NavBarAdmin } from "./NavBarAdmin";
import { Breadcrumbs } from "./Breadcrumbs";

interface AdminShellProps {
  children: ReactNode;
  title?: string;
  crumbs?: Array<{ label: string; href?: string }>;
}

export const AdminShell: React.FC<AdminShellProps> = ({ children, title = "Admin Dashboard", crumbs }) => {
  const navigate = useNavigate();

  // Don't render admin interface if user is not admin (additional safety check)
  // if (isBrowser && !isAdmin) {
  //   return null;
  // }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <NavBarAdmin />
      {/* Main Content */}
      <main className="flex-1">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-2">
              {title && (
                <div className="mb-6 mr-auto">
                  <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                </div>
              )}
              <div>
                {/* {parentTo && (
                  <Button type="button" variant="outline" onClick={() => navigate({ to: parentTo })}>
                    Tilbage
                  </Button>
                )} */}
              </div>
            </div>
            <div className="mb-4">{crumbs && <Breadcrumbs crumbs={[{ label: "Admin", href: "/godaddy" }, ...crumbs]} />}</div>

            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
