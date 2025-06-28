import React from "react";
import { Navbar } from "../Navbar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow w-full max-w-[1024px] mx-auto mt-24">
        <div className="px-4">{children}</div>
      </main>
    </div>
  );
}
