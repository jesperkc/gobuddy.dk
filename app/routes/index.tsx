import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Users, Sparkles, MessageCircle, Calendar, Heart } from "lucide-react";
import { UnauthedRoute } from "@/components/UnauthedRoute";
import { GobuddyLogo } from "@/components/GobuddyLogo";

const HERO_BUDDIES = [
  { initials: "MK", name: "Mads K.", age: 33, city: "København S", distance: "2,3 km", interests: ["Svømning", "Løb", "Kajakroning"], match: 91, featured: true },
  { initials: "JH", name: "Jonas H.", age: 47, city: "København", distance: "4,1 km", interests: ["Golf", "Løb"], match: 87 },
  { initials: "LM", name: "Lasse M.", age: 40, city: "København", distance: "5,8 km", interests: ["CrossFit", "Klatring"], match: 84 },
  { initials: "PF", name: "Per F.", age: 49, city: "Aarhus", distance: "3,2 km", interests: ["Golf", "Fiskeri"], match: 78 },
] as const;

function HeroBuddyCards() {
  const featured = HERO_BUDDIES[0];
  const behind = HERO_BUDDIES.slice(1);

  return (
    <div className="relative w-full max-w-sm mx-auto lg:mx-0" aria-hidden="true">
      {/* Background glow */}
      <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-[var(--brand-green)]/10 via-transparent to-[var(--brand-blue)]/10 blur-2xl" />

      <div className="relative">
        {/* Featured front card */}
        <div
          className="hero-card relative z-10"
          style={{ animationDelay: "0s" }}
        >
          <div className="relative rounded-2xl border border-gray-100 bg-white shadow-lg p-5">
            <div className="absolute -top-3 right-5 flex items-center gap-1 rounded-full bg-[var(--brand-green)] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
              <Sparkles size={10} />
              Bedste match
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700">
                {featured.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-base truncate">{featured.name}</p>
                  <span className="text-xs text-gray-400">{featured.age} år</span>
                </div>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin size={10} /> {featured.distance} væk
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-sm font-bold text-[var(--brand-green)]">{featured.match}%</span>
                <p className="text-[10px] text-gray-300">match</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3">
              {featured.interests.map((interest, j) => (
                <span
                  key={interest}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                    j < 2
                      ? "bg-blue-50 text-blue-700 ring-blue-100"
                      : "bg-violet-50 text-violet-700 ring-violet-100"
                  }`}
                >
                  {interest}
                </span>
              ))}
            </div>

            <button
              className="mt-4 w-full rounded-lg bg-gradient-to-r from-[var(--brand-green)] to-[var(--brand-blue)] py-2.5 text-sm font-medium text-white"
              tabIndex={-1}
            >
              Send high-five
            </button>
          </div>
        </div>

        {/* Cards peeking out behind — stacked below the front card */}
        {behind.map((buddy, i) => (
          <div
            key={buddy.initials}
            className="hero-card relative"
            style={{
              animationDelay: `${(i + 1) * 0.1}s`,
              zIndex: behind.length - i,
              marginTop: i === 0 ? "-14px" : "-30px",
              scale: `${1 - (i + 1) * 0.06}`,
            }}
          >
            <div className="rounded-2xl border border-gray-100/80 bg-white shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-400">
                  {buddy.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-500 truncate">{buddy.name}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <MapPin size={10} /> {buddy.distance} væk
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 shrink-0 max-w-[120px] justify-end">
                  {buddy.interests.map((interest) => (
                    <span key={interest} className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-50 text-gray-400 ring-1 ring-gray-100">
                      {interest}
                    </span>
                  ))}
                </div>
                <span className={`text-sm font-bold shrink-0 ml-1 ${
                  buddy.match >= 85 ? "text-blue-400" : "text-gray-300"
                }`}>
                  {buddy.match}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepCard({ number, icon, title, description, delay }: {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: string;
}) {
  return (
    <div
      className="card-reveal relative bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-blue)] flex items-center justify-center text-white font-bold text-sm">
          {number}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-gray-400">{icon}</span>
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <p className="text-gray-500 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-background/50 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <GobuddyLogo className="logo h-10" withText />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2"
            >
              Log ind
            </Link>
            <Link
              to="/details"
              className="text-sm font-medium bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:bg-primary/90 transition-colors shadow-sm"
            >
              Kom i gang
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="/hero-bg.jpg"
            alt=""
            className="h-full w-full object-cover object-[center_25%]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#faf9f7] via-[#faf9f7]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#faf9f7] via-[#faf9f7]/20 to-[#faf9f7]/40" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: text */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm text-gray-600 mb-8 shadow-sm">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--brand-green)] animate-pulse" />
                Nyt i Danmark — gratis at bruge
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] leading-[1.08] mb-6 tracking-tight">
                Find en makker
                <br />
                <span className="bg-gradient-to-r from-[var(--brand-green)] to-[var(--brand-blue)] bg-clip-text text-transparent">
                  der deler dine interesser
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-500 max-w-lg mx-auto lg:mx-0 mb-10 leading-relaxed">
                GoBuddy matcher dig med ligesindede i dit nærområde baseret på jeres fælles interesser.
              </p>

              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4">
                <Link
                  to="/details"
                  className="glow-button inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-base font-medium bg-white text-black"
                >
                  Opret din profil
                  <ArrowRight size={18} />
                </Link>
                <a
                  href="#hvordan"
                  className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-base font-medium px-4 py-3.5"
                >
                  Se hvordan det virker
                  <ArrowRight size={16} />
                </a>
              </div>
            </div>

            {/* Right: buddy cards */}
            <div className="flex justify-center lg:justify-end">
              <HeroBuddyCards />
            </div>
          </div>
        </div>
      </section>

      {/* Social proof strip */}
      <section className="border-y border-gray-100 bg-white/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-gray-400">
          <span className="flex items-center gap-2">
            <Users size={16} className="text-[var(--brand-green)]" />
            34+ interesser at vælge imellem
          </span>
          <span className="hidden sm:inline text-gray-200">|</span>
          <span className="flex items-center gap-2">
            <MapPin size={16} className="text-[var(--brand-blue)]" />
            Hele Danmark
          </span>
          <span className="hidden sm:inline text-gray-200">|</span>
          <span className="flex items-center gap-2">
            <Heart size={16} className="text-[var(--brand-green)]" />
            100% gratis
          </span>
        </div>
      </section>

      {/* How it works */}
      <section id="hvordan" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-medium text-[var(--brand-blue)] uppercase tracking-wide mb-3">Sådan virker det</p>
            <h2 className="text-3xl sm:text-4xl">
              Tre trin til nye makkerskaber
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            <StepCard
              number="1"
              icon={<Sparkles size={18} />}
              title="Vælg dine interesser"
              description="Fortæl os hvad du dyrker — fra padel og løb til cykling og svømning."
              delay="0s"
            />
            <StepCard
              number="2"
              icon={<MapPin size={18} />}
              title="Del din placering"
              description="Vi finder folk i dit nærområde, så det er nemt at mødes og træne sammen."
              delay="0.1s"
            />
            <StepCard
              number="3"
              icon={<MessageCircle size={18} />}
              title="Find din makker"
              description="Send en high-five, start en samtale, eller mød op til en aktivitet med din nye makker."
              delay="0.2s"
            />
          </div>
        </div>
      </section>

      {/* Sticker between sections */}
      <div className="flex justify-center -mt-10 -mb-10 relative z-10">
        <img
          src="/sticker-cycling.svg"
          alt="New Cycling Buddy"
          className="w-28 h-28 sm:w-36 sm:h-36 -rotate-6 drop-shadow-lg pointer-events-none select-none"
        />
      </div>

      {/* Features */}
      <section className="py-20 sm:py-28 bg-white/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-medium text-[var(--brand-green)] uppercase tracking-wide mb-3">Intelligent matching</p>
              <h2 className="text-3xl sm:text-4xl mb-6">
                Mere end bare fælles interesser
              </h2>
              <p className="text-lg text-gray-500 leading-relaxed mb-8">
                GoBuddy forstår sammenhængen mellem interesser. Dyrker du løb? Så matcher vi dig også med folk der er vilde med triatlon eller CrossFit. Vores algoritme finder de skjulte forbindelser.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-1 w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[var(--brand-blue)]" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Fælles interesser</p>
                    <p className="text-sm text-gray-500">Match direkte på de interesser I deler</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-1 w-5 h-5 rounded-full bg-violet-50 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-violet-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Relaterede interesser</p>
                    <p className="text-sm text-gray-500">Find folk med interesser der komplementerer dine</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-1 w-5 h-5 rounded-full bg-green-50 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[var(--brand-green)]" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Nærhed</p>
                    <p className="text-sm text-gray-500">Makkere i din by gør det let at mødes</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual: interest matching demo */}
            <div className="relative">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">DIG</div>
                  <div>
                    <p className="font-semibold text-sm">Dine interesser</p>
                    <p className="text-xs text-gray-400">Baseret på din profil</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-6">
                  {["Løb", "Cykling", "Svømning"].map((i) => (
                    <span key={i} className="rounded-full px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-100">{i}</span>
                  ))}
                </div>

                <div className="border-t border-dashed border-gray-200 my-5" />

                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm">MK</div>
                  <div>
                    <p className="font-semibold text-sm">Mads K.</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={10} /> 2,3 km væk</p>
                  </div>
                  <span className="ml-auto text-xs font-medium text-[var(--brand-green)] bg-green-50 rounded-full px-2.5 py-0.5">91% match</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="rounded-full px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-100">Løb</span>
                  <span className="rounded-full px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-100">Svømning</span>
                  <span className="rounded-full px-3 py-1 text-xs font-medium bg-violet-50 text-violet-700 ring-1 ring-violet-100">Triatlon</span>
                  <span className="rounded-full px-3 py-1 text-xs font-medium bg-gray-50 text-gray-600 ring-1 ring-gray-100">Kajakroning</span>
                </div>
                <p className="text-xs text-violet-600 flex items-center gap-1">
                  <Sparkles size={12} />
                  Løb + Svømning → Triatlon (94% relateret)
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Activities section */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-medium text-[var(--brand-green)] uppercase tracking-wide mb-3">Aktiviteter</p>
            <h2 className="text-3xl sm:text-4xl mb-4">
              Mød op til noget fedt
            </h2>
            <p className="text-lg text-gray-500 max-w-lg mx-auto">
              Opret eller deltag i aktiviteter med folk der deler dine interesser. Fra løbeture til padel-kampe.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {[
              { title: "Fredagsløb i Fælledparken", interest: "Løb", people: "8 deltagere", date: "Hver fredag kl. 17", delay: "0s" },
              { title: "Padel i Ørestad", interest: "Padel Tennis", people: "4 deltagere", date: "Lørdag 12. april", delay: "0.1s" },
              { title: "Cykeltur langs kysten", interest: "Cykling", people: "6 deltagere", date: "Søndag 13. april", delay: "0.15s" },
              { title: "CrossFit i Amager Strandpark", interest: "CrossFit", people: "5 deltagere", date: "Torsdag 10. april", delay: "0.2s" },
            ].map((event) => (
              <div
                key={event.title}
                className="card-reveal rounded-2xl border border-gray-100 bg-white p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                style={{ animationDelay: event.delay }}
              >
                <h3 className="font-semibold text-base mb-2">{event.title}</h3>
                <div className="space-y-1.5 text-sm text-gray-500 mb-3">
                  <p className="flex items-center gap-2"><Calendar size={14} /> {event.date}</p>
                  <p className="flex items-center gap-2"><Users size={14} /> {event.people}</p>
                </div>
                <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                  {event.interest}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 sm:py-28 bg-white/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-50 mb-8">
            <GobuddyLogo className="logo w-8 h-8" />
          </div>
          <blockquote className="text-xl sm:text-2xl leading-relaxed text-gray-700 mb-6">
            "Jeg manglede en makker til padel og løb. Via GoBuddy fandt jeg Jonas, og nu træner vi sammen tre gange om ugen. Det er fedt at have nogen der holder én op på det."
          </blockquote>
          <p className="text-gray-400 font-medium">Mads K. — København</p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl mb-4">
            Klar til at finde din makker?
          </h2>
          <p className="text-lg text-gray-500 mb-10 max-w-md mx-auto">
            Det tager under 2 minutter at oprette din profil. Helt gratis, ingen forpligtelser.
          </p>
          <Link
            to="/details"
            className="glow-button inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-base font-medium bg-white text-black"
          >
            Opret din profil
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <GobuddyLogo className="logo h-7" withText />
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} GoBuddy — Lavet med kærlighed i Danmark
          </p>
        </div>
      </footer>
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
