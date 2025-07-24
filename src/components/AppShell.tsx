import React from "react";
// import { Link } from "@tanstack/react-router";
// import { LogOut, User, Menu, X } from "lucide-react";
// import Logo from "../assets/gobuddy-logo.svg?react";
// import { useAuth } from "../contexts/AuthContext";
// import { useUserProfileStore } from "../store/userProfile";
// import { Button } from "./ui/button";
import { Navbar } from "./NavBar";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  showUserMenu?: boolean;
}

export function DefaultLayout({ children, title }: AppShellProps) {
  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-white max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Navigation */}

        {/* Main Content */}
        <main className="flex-1">
          {title && (
            <div className="bg-gray-50 border-b border-gray-200">
              <div className="px-4 sm:px-6 lg:px-8 py-6">
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              </div>
            </div>
          )}

          <div className="py-20">{children}</div>
        </main>
      </div>
    </div>
  );
}
