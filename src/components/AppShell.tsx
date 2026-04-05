import React from "react";
import { Navbar } from "./NavBar";
interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  showUserMenu?: boolean;
}

export function DefaultLayout({ children, title }: AppShellProps) {
  return (
    <div>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md"
      >
        Gå til indhold
      </a>
      <Navbar />
      <div className="min-h-screen bg-white max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <main id="main-content" className="flex-1">
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
