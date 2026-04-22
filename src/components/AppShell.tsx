import React from "react";
import { Navbar } from "./NavBar";

interface AppShellProps {
  children: React.ReactNode;
  header?: React.ReactNode;
}

export function DefaultLayout({ children, header }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md"
      >
        Gå til indhold
      </a>
      <Navbar />
      <main id="main-content">
        {header ? (
          <>
            <div className="bg-white border-b border-gray-100 pt-20 shadow-sm">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">{header}</div>
            </div>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
          </>
        ) : (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-20">{children}</div>
          </div>
        )}
      </main>
    </div>
  );
}
