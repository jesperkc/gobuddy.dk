import Logo from "../assets/gobuddy-logo.svg?react";
import { getRandomQuote } from "@/lib/helpers";
import { Link } from "@tanstack/react-router";
import React from "react";

interface SplitScreenProps {
  children: React.ReactNode;
  image?: string;
}

export function SplitScreen({ children, image }: SplitScreenProps) {
  const quote = React.useMemo(() => getRandomQuote(), []);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <div className="w-full lg:w-1/2 p-4 sm:p-6 lg:p-8 flex items-center justify-center bg-white order-2 lg:order-1">
        <Link to={"/"}>
          <Logo className="logo w-12 h-12 absolute inset-10" />
        </Link>
        <div className="max-w-md w-full">{children}</div>
      </div>
      <div
        className="w-full lg:w-1/2 min-h-[40vh] lg:min-h-screen bg-cover bg-center relative order-1 lg:order-2"
        style={{ backgroundImage: `url(${image ?? quote.image})` }}
      >
        <div className="absolute inset-0 flex lg:items-end justify-center p-4 sm:p-6 lg:p-8">
          <blockquote className="text-white max-w-lg">
            <p className="text-xl sm:text-2xl font-light italic mb-3 sm:mb-4">
              "{quote.text}"
            </p>
            <footer className="text-base sm:text-lg">— {quote.author}</footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
