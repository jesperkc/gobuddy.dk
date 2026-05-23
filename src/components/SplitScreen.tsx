import { Link } from "@tanstack/react-router";
import { GobuddyLogo } from "./GobuddyLogo";
import CyclistIllustration from "../assets/illustrations/cyclist.svg?react";
import TennisIllustration from "../assets/illustrations/tennisplayer.svg?react";
import LifterIllustration from "../assets/illustrations/lifter.svg?react";
import React from "react";

const ILLUSTRATIONS = {
  cyclist: CyclistIllustration,
  tennis: TennisIllustration,
  lifter: LifterIllustration,
};

export type SplitScreenIllustration = keyof typeof ILLUSTRATIONS;

interface SplitScreenProps {
  children: React.ReactNode;
  illustration?: SplitScreenIllustration;
  tagline?: string;
}

export function SplitScreen({ children, illustration = "cyclist", tagline }: SplitScreenProps) {
  const Illustration = ILLUSTRATIONS[illustration];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#f5f3ef]">
      {/* Form panel */}
      <div className="relative w-full lg:w-1/2 px-6 py-12 sm:px-10 sm:py-16 lg:p-12 flex items-center justify-center order-2 lg:order-1">
        <Link to="/" className="absolute top-6 left-6 sm:top-8 sm:left-8 lg:top-10 lg:left-10" aria-label="GoBuddy">
          <GobuddyLogo className="logo h-8 sm:h-9" withText />
        </Link>
        <div className="max-w-md w-full">{children}</div>
      </div>

      {/* Illustration panel */}
      <div className="relative w-full lg:w-1/2 min-h-[40vh] lg:min-h-screen bg-green-500 order-1 lg:order-2 flex items-center justify-center overflow-hidden">
        <div className="flex flex-col items-center w-full max-w-md px-6 py-10 sm:px-10 sm:py-16">
          <Illustration className="w-[55%] sm:w-[60%] lg:w-[75%] max-w-[360px] h-auto" />
          {tagline && (
            <p className="mt-8 text-center text-base sm:text-lg text-gray-900/80 leading-relaxed max-w-sm">
              {tagline}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
