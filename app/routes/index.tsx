import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { UnauthedRoute } from "@/components/UnauthedRoute";
import { GobuddyLogo } from "@/components/GobuddyLogo";
import CyclistIllustration from "@/assets/illustrations/cyclist.svg?react";
import TennisIllustration from "@/assets/illustrations/tennisplayer.svg?react";
import LifterIllustration from "@/assets/illustrations/lifter.svg?react";
import { useClientEffect } from "@/lib/ssr-utils";

type FannedBuddy = {
  initials: string;
  name: string;
  age: number;
  interest: string;
};

const HERO_BUDDIES: FannedBuddy[] = [
  { initials: "SØ", name: "Søren", age: 21, interest: "Bouldering" },
  { initials: "MA", name: "Mathias", age: 40, interest: "Cykling" },
  { initials: "PE", name: "Peter", age: 53, interest: "Tennis" },
  { initials: "JO", name: "John", age: 49, interest: "Løb" },
  { initials: "LA", name: "Lasse", age: 33, interest: "Vægtløftning" },
];

type FanLayout = {
  tx: number;
  ty: number;
  rotate: number;
  scale: number;
  z: number;
  parallax: number;
  hideOnMobile: boolean;
};

const FAN_LAYOUT: FanLayout[] = [
  { tx: -260, ty: 0, rotate: 9, scale: 0.94, z: 1, parallax: -0.22, hideOnMobile: true },
  { tx: -130, ty: 20, rotate: -6, scale: 0.97, z: 2, parallax: -0.18, hideOnMobile: false },
  { tx: 0, ty: 0, rotate: 0, scale: 1.04, z: 5, parallax: -0.1, hideOnMobile: false },
  { tx: 130, ty: 20, rotate: 10, scale: 0.97, z: 2, parallax: -0.22, hideOnMobile: false },
  { tx: 260, ty: 0, rotate: -4, scale: 0.94, z: 1, parallax: -0.18, hideOnMobile: true },
];

function FannedCard({ buddy, index, scrollY }: { buddy: FannedBuddy; index: number; scrollY: number }) {
  const layout = FAN_LAYOUT[index];
  const parallaxY = scrollY * layout.parallax;

  return (
    <div
      className={`absolute top-0 left-1/2 will-change-transform ${layout.hideOnMobile ? "hidden md:block" : ""}`}
      style={{
        transform: `translate3d(calc(-50% + ${layout.tx}px), ${layout.ty + parallaxY}px, 0) rotate(${layout.rotate}deg) scale(${layout.scale})`,
        zIndex: layout.z,
      }}
      aria-hidden={index !== 2}
    >
      <div className="w-[150px] sm:w-[170px] rounded-2xl bg-white shadow-xl p-5 flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white text-lg mb-3 tracking-wide">
          {buddy.initials}
        </div>
        <h3 className="font-semibold text-base text-gray-900 leading-tight">
          {buddy.name}
          <span className="text-gray-400 font-normal ml-1.5">{buddy.age}</span>
        </h3>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-500 px-3 py-1 text-[11px] font-medium text-white">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 22 22 2 22" />
          </svg>
          {buddy.interest}
        </div>
      </div>
    </div>
  );
}

function useInView<T extends HTMLElement>(threshold = 0.35): [(node: T | null) => void, boolean] {
  const [el, setEl] = useState<T | null>(null);
  const [inView, setInView] = useState(false);

  useClientEffect(() => {
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            // observer.disconnect();
          } else {
            setInView(false);
          }
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);

  return [setEl, inView];
}

function HighlightPill({ children, inView }: { children: React.ReactNode; inView: boolean }) {
  return (
    <span
      className="relative inline-block align-baseline"
      style={{
        margin: inView ? ".5rem" : "0rem",
        transition: "margin 0.3s linear",
        transitionDelay: inView ? "1.1s" : "0s",
      }}
    >
      <span
        className="absolute -inset-x-3 inset-y-0 bg-green-500 rounded-full origin-left"
        style={{
          color: inView ? "white" : "inherit",
          transform: inView ? "scale(1, 1)" : "scale(.09, .07)",
          transformOrigin: "center",
          transition:
            "transform 1.7s linear(0, 0.041 1.1%, 0.162 2.3%, 1.067 8.4%, 1.212 10.2%, 1.252 11.1%, 1.271 12%, 1.269 13.2%, 1.236 14.6%, 0.976 21.1%, 0.94 22.8%, 0.926 24.5%, 0.935 27.1%, 1.006 33.6%, 1.02 36.9%, 0.995 49.3%, 1.001 61.6%, 1)",
          transitionDelay: inView ? "1s" : "0s",
        }}
        aria-hidden
      />
      <span
        className="relative"
        style={{
          color: inView ? "white" : "inherit",
          transition: "color 0s",
          transitionDelay: inView ? "1s" : "0s",
        }}
      >
        {children}
      </span>
    </span>
  );
}

type StoryRowProps = {
  side: "left" | "right";
  illustration: React.ReactNode;
  children: React.ReactNode;
};

function StoryRow({ side, illustration, children }: StoryRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-8 md:gap-12">
      {side === "left" ? (
        <>
          <div className="flex justify-center md:justify-start">
            <div className="w-[220px] sm:w-[280px] md:w-[340px]">{illustration}</div>
          </div>
          <div className="text-2xl sm:text-3xl md:text-4xl leading-snug text-gray-900 text-center md:text-left">{children}</div>
        </>
      ) : (
        <>
          <div className="text-2xl sm:text-3xl md:text-4xl leading-snug text-gray-900 text-center md:text-right order-2 md:order-1">
            {children}
          </div>
          <div className="flex justify-center md:justify-end order-1 md:order-2">
            <div className="w-[220px] sm:w-[280px] md:w-[340px]">{illustration}</div>
          </div>
        </>
      )}
    </div>
  );
}

function ConnectorCurve({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [inView, setInView] = useState(false);

  useClientEffect(() => {
    if (!ref.current) return;
    const node = ref.current;

    const update = () => setWidth(node.getBoundingClientRect().width);
    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(node);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setInView(entry.isIntersecting);
      },
      { threshold: 0.35 },
    );
    intersectionObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, []);

  const strokeWidth = 10;
  const svgHeight = 235;
  const referenceWidth = 770;
  const w = Math.max(width ?? referenceWidth, 320);

  // Left side anchored to the left edge (coordinates from the reference path).
  const leftStartX = 5;
  const topY = 5;
  const topVertEndY = 15.767;
  const leftCurveCtrl1Y = 122.703;
  const leftCurveCtrl2X = 107.883;
  const leftCurveCtrl2Y = 199.541;
  const leftCurveEndX = 210.42;
  const leftCurveEndY = 169.185;

  // Right side anchored to the right edge via offsets from the reference width.
  // The diagonal L segment stretches as the width changes.
  const diagonalEndX = w - (referenceWidth - 559.58);
  const diagonalEndY = 65.8151;
  const rightCurveCtrl1X = w - (referenceWidth - 662.117);
  const rightCurveCtrl1Y = 35.4588;
  const rightVertX = w - (referenceWidth - 765);
  const rightCurveCtrl2Y = 112.297;
  const rightVertStartY = 219.233;
  const bottomY = 230;

  const path =
    `M${leftStartX} ${topY}` +
    `V${topVertEndY}` +
    `C${leftStartX} ${leftCurveCtrl1Y} ${leftCurveCtrl2X} ${leftCurveCtrl2Y} ${leftCurveEndX} ${leftCurveEndY}` +
    `L${diagonalEndX} ${diagonalEndY}` +
    `C${rightCurveCtrl1X} ${rightCurveCtrl1Y} ${rightVertX} ${rightCurveCtrl2Y} ${rightVertX} ${rightVertStartY}` +
    `V${bottomY}`;

  return (
    <div ref={ref} className={className ? className : "w-full"}>
      <svg
        width={w}
        height={svgHeight}
        viewBox={`0 0 ${w} ${svgHeight}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={flip ? { transform: "scaleX(-1)" } : undefined}
      >
        <path
          d={path}
          stroke="#27D489"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={inView ? 0 : 0}
          style={{ transition: "stroke-dashoffset 1.8s ease-out" }}
        />
      </svg>
    </div>
  );
}

function Index() {
  const [scrollY, setScrollY] = useState(0);

  useClientEffect(() => {
    let raf = 0;
    let pending = false;
    const handleScroll = () => {
      if (pending) return;
      pending = true;
      raf = window.requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        pending = false;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  const [pill1Ref, pill1InView] = useInView<HTMLDivElement>();
  const [pill2Ref, pill2InView] = useInView<HTMLDivElement>();
  const [pill3Ref, pill3InView] = useInView<HTMLDivElement>();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero — green background */}
      <section className="relative bg-green-500 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 sm:pt-8 sm:pb-28">
          {/* Logo + nav */}
          <div className="flex items-center justify-between mb-10 sm:mb-14">
            <Link to="/" className="flex items-center" aria-label="GoBuddy">
              <GobuddyLogo className="logo h-9 sm:h-10" withText colorLeft="#ffffff" colorRight="#ffffff" />
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link to="/login" className="text-sm font-medium text-gray-900/80 hover:text-gray-900 transition-colors px-3 py-2">
                Log ind
              </Link>
              <Link
                to="/details"
                className="text-sm font-medium bg-gray-900 text-white rounded-full px-4 py-2 hover:bg-gray-800 transition-colors shadow-sm"
              >
                Kom i gang
              </Link>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-center text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight mb-12 sm:mb-16">
            <span className="block text-gray-900">Mød dine nye</span>
            <span className="block text-white">bedste venner</span>
          </h1>

          {/* Fanned cards */}
          <div className="relative h-[220px] sm:h-[260px] mb-12">
            {HERO_BUDDIES.map((buddy, i) => (
              <FannedCard key={buddy.initials} buddy={buddy} index={i} scrollY={scrollY} />
            ))}
          </div>

          {/* Subtitle */}
          <p className="text-center text-sm sm:text-base text-gray-900/80 max-w-md mx-auto leading-relaxed">
            Find ligesindede i dit nærområde — gratis, lokalt, til hvad du end dyrker.
          </p>
        </div>
      </section>

      {/* Story sections with connecting green curve */}
      <section className="relative bg-background overflow-hidden">
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            {/* Section 1: cyclist left, text right */}
            <div ref={pill1Ref} className="py-12 sm:py-16">
              <StoryRow side="left" illustration={<CyclistIllustration className="w-full h-auto" />}>
                Søren elsker <HighlightPill inView={pill1InView}>cykling</HighlightPill> og mangler af og til en makker at køre med
              </StoryRow>
            </div>

            <ConnectorCurve className="w-[70%] m-auto" />

            {/* Section 2: tennis right, text left */}
            <div ref={pill2Ref} className="py-12 sm:py-16">
              <StoryRow side="right" illustration={<TennisIllustration className="w-full h-auto" />}>
                Peter kan godt lide at spille <HighlightPill inView={pill2InView}>tennis</HighlightPill> men det er nemmere når man er to
              </StoryRow>
            </div>

            <ConnectorCurve flip className="w-[70%] m-auto" />

            {/* Section 3: lifter left, text right */}
            <div ref={pill3Ref} className="py-12 sm:py-16 pb-24 sm:pb-32">
              <StoryRow side="left" illustration={<LifterIllustration className="w-full h-auto" />}>
                Det er bedre at løfte i flok. Mathias synes i hvert fald at <HighlightPill inView={pill3InView}>fitness</HighlightPill> er
                sjovere sammen.
              </StoryRow>
            </div>
          </div>
        </div>
      </section>

      {/* Sådan virker det */}
      <section className="bg-background pt-8 pb-24 sm:pb-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium tracking-[0.15em] uppercase text-gray-500 mb-2">Sådan virker det</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl text-gray-900 leading-tight mb-14 sm:mb-16">
            Tre skridt til den buddy
            <br />
            du har manglet.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-8">
            <Step
              number="01"
              title="Opret din profil"
              description="Fortæl hvad du dyrker, hvor ofte og hvor du holder til. Tager to minutter."
            />
            <Step
              number="02"
              title="Find din buddy"
              description="Vi viser dig folk i nærheden med samme niveau og interesser. Du bestemmer."
            />
            <Step number="03" title="Mødes og træn" description="Skriv en kort besked, find et tidspunkt, og kom afsted. Helt gratis." />
          </div>

          <div className="mt-16 sm:mt-20 flex justify-center">
            <Link
              to="/details"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full text-base font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors shadow-lg"
            >
              Kom i gang gratis
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-10">
            <div className="sm:col-span-1">
              <p className="text-sm leading-relaxed text-gray-400">Find din perfekte buddy og gør jeres hobby sjovere sammen</p>
            </div>

            <FooterColumn
              title="Produktet"
              links={[
                { label: "Sådan virker det", href: "#hvordan" },
                { label: "Aktiviteter", href: "#" },
                { label: "Priser", href: "#" },
              ]}
            />

            <FooterColumn
              title="Ressourcer"
              links={[
                { label: "Blog", href: "#" },
                { label: "Hjælp", href: "#" },
                { label: "FAQ", href: "#" },
              ]}
            />

            <FooterColumn
              title="GoBuddy"
              links={[
                { label: "Om os", href: "#" },
                { label: "Kontakt", href: "#" },
                { label: "Privatlivspolitik", href: "#" },
              ]}
            />
          </div>

          <div className="mt-12 pt-6 border-t border-gray-800 text-center">
            <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} GoBuddy. Alle rettigheder forbeholdes.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-900 mb-3">{number}</p>
      <div className="h-px bg-gray-900/20 mb-4" />
      <h3 className="text-xl text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="text-sm font-semibold text-white mb-4">{title}</p>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <a href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UnauthedIndex() {
  return (
    <UnauthedRoute>
      <Index />
    </UnauthedRoute>
  );
}

export const Route = createFileRoute("/")({
  component: UnauthedIndex,
});
