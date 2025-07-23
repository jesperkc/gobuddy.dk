import React, { useContext, useState } from "react";
import { AuthContext } from "../../pages/_authed";
import { Link, useRouter } from "@tanstack/react-router";
import { Logo } from "../layout/Logo";

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface AdminNavItem {
  label: string;
  path: string;
  icon: string;
}

const adminNavItems: AdminNavItem[] = [
  { label: "Dashboard", path: "/godaddy", icon: "📊" },
  { label: "Users", path: "/godaddy/users", icon: "👥" },
  { label: "Create User", path: "/godaddy/users/create", icon: "➕" },
  { label: "Reports", path: "/godaddy/reports", icon: "📈" },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useContext(AuthContext);
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    const { error } = await logout();
    if (!error) {
      router.navigate({ to: "/" });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex items-center justify-center h-16 px-4 bg-gray-800">
          <div className="flex items-center space-x-2">
            <Logo className="h-8 w-8" />
            <span className="text-white font-semibold text-lg">GoBuddy Admin</span>
          </div>
        </div>

        <nav className="mt-8">
          <div className="px-4 space-y-2">
            {adminNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center px-4 py-2 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors duration-200 [&.active]:bg-blue-600 [&.active]:text-white"
                activeProps={{ className: "bg-blue-600 text-white" }}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* User info and logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-300">
            <div>
              <p className="font-medium">{user?.email}</p>
              <p className="text-xs text-gray-400">Administrator</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors duration-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">Welcome to the admin panel</div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
