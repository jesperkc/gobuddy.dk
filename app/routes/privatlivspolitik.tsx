import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { GobuddyLogo } from "@/components/GobuddyLogo";
import { MIN_AGE } from "@/lib/age";

// Data controller details. GoBuddy is run by a private person; keep these in
// sync with reality — GDPR art. 13 requires the controller's identity and contact.
const CONTROLLER_NAME = "Jesper Klitgaard";
const CONTROLLER_ADDRESS = "Theodore Roosevelts Vej 1, 2450 København SV";
const CONTACT_EMAIL = "hej@gobuddy.dk";
const LAST_UPDATED = "29. september 2026";

const SECTIONS = [
  { id: "ansvarlig", title: "Hvem er ansvarlig" },
  { id: "oplysninger", title: "Hvad vi indsamler og hvorfor" },
  { id: "synlighed", title: "Hvad andre kan se" },
  { id: "modtagere", title: "Hvem vi deler med" },
  { id: "opbevaring", title: "Hvor længe vi gemmer" },
  { id: "lokal-lagring", title: "Cookies og lokal lagring" },
  { id: "rettigheder", title: "Dine rettigheder" },
  { id: "alder", title: "Aldersgrænse" },
  { id: "aendringer", title: "Ændringer" },
];

type DataRow = { data: string; purpose: string; basis: string };

const DATA_ROWS: DataRow[] = [
  {
    data: "E-mail og adgangskode",
    purpose: "Oprette din konto og logge dig ind. Adgangskoden gemmes kun krypteret (hashet).",
    basis: "Aftale (art. 6, stk. 1, litra b)",
  },
  {
    data: "Fornavn og alder",
    purpose: "Vise din profil til andre, så I kan finde hinanden.",
    basis: "Aftale",
  },
  {
    data: "Interesser, og hvad du ikke er interesseret i",
    purpose: "Matche dig med folk, der dyrker det samme.",
    basis: "Aftale",
  },
  {
    data: "Placering: koordinater, by, postnummer og land",
    purpose: "Finde folk i nærheden og vise afstanden mellem jer.",
    basis: "Aftale",
  },
  {
    data: "Profilbillede, beskrivelser og opslag",
    purpose: "Det, du selv vælger at dele på din profil og i aktiviteter.",
    basis: "Aftale",
  },
  {
    data: "Beskeder",
    purpose: "Levere dine beskeder til den, du skriver med.",
    basis: "Aftale",
  },
  {
    data: "Nyhedsbrev",
    purpose: "Sende dig nyheder om GoBuddy, hvis du har sagt ja.",
    basis: "Samtykke (art. 6, stk. 1, litra a)",
  },
  {
    data: "Strava-forbindelse",
    purpose: "Hvis du forbinder Strava: dit Strava-id, navn og aktiviteter, så de kan vises på GoBuddy.",
    basis: "Samtykke",
  },
];

type Recipient = { name: string; role: string; where: string };

const RECIPIENTS: Recipient[] = [
  { name: "Supabase", role: "Database, login, filer og beskeder", where: "EU (Frankfurt)" },
  { name: "Netlify", role: "Hosting af hjemmesiden", where: "USA, med EU-standardkontrakter" },
  { name: "OpenStreetMap Foundation (Nominatim)", role: "Opslag af adresser, når du søger efter din by", where: "EU / Storbritannien" },
  { name: "Stadia Maps", role: "Kortbilleder, når et kort vises", where: "EU / USA" },
  { name: "Strava", role: "Kun hvis du selv forbinder din Strava-konto", where: "USA" },
];

function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-gray-900 selection:bg-green-200 selection:text-gray-900">
      <header className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 flex items-center justify-between">
        <Link to="/" aria-label="GoBuddy – forsiden">
          <GobuddyLogo className="logo h-8 sm:h-9" withText />
        </Link>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Forsiden
        </Link>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20 pb-24 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="Indhold" className="hidden lg:block">
          <ol className="sticky top-8 space-y-2.5 border-l border-gray-200 pl-4 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-gray-500 hover:text-gray-900 transition-colors">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="max-w-[68ch]">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-balance">Privatlivspolitik</h1>
          <p className="mt-3 text-sm text-gray-500">Senest opdateret {LAST_UPDATED}</p>

          <div className="mt-10 rounded-2xl bg-green-50 ring-1 ring-green-100 p-6 sm:p-7">
            <h2 className="text-xl font-semibold text-green-950">Kort fortalt</h2>
            <ul className="mt-3 space-y-2 text-green-950/90 leading-relaxed list-disc pl-5 marker:text-green-600">
              <li>Vi bruger dine oplysninger til én ting: at hjælpe dig med at finde buddies med samme interesser i nærheden.</li>
              <li>Vi sælger aldrig dine data og viser ingen annoncer.</li>
              <li>Vi bruger ingen sporings- eller reklamecookies.</li>
              <li>
                Du kan altid slette din konto under Rediger profil, og få indsigt i dine data ved at skrive til{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium underline underline-offset-4 decoration-green-600/50 hover:decoration-green-700">
                  {CONTACT_EMAIL}
                </a>
                .
              </li>
            </ul>
          </div>

          <Section id="ansvarlig" title="Hvem er ansvarlig">
            <p>
              GoBuddy drives af {CONTROLLER_NAME} som privatperson, der er dataansvarlig for behandlingen af dine personoplysninger. Har du
              spørgsmål til, hvordan vi behandler dine data, kan du skrive til{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
            <address className="mt-4 not-italic leading-relaxed text-gray-700">
              {CONTROLLER_NAME}
              <br />
              {CONTROLLER_ADDRESS}
              <br />
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </address>
          </Section>

          <Section id="oplysninger" title="Hvad vi indsamler og hvorfor">
            <p>
              Vi indsamler kun det, du selv giver os, når du opretter og bruger din profil. Retsgrundlaget henviser til
              databeskyttelsesforordningen (GDPR) artikel 6.
            </p>
            <dl className="mt-6 divide-y divide-gray-200 border-y border-gray-200">
              {DATA_ROWS.map((row) => (
                <div key={row.data} className="py-4 sm:grid sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
                  <dt className="font-semibold text-gray-900">{row.data}</dt>
                  <dd className="mt-1 sm:mt-0">
                    <p className="text-gray-700">{row.purpose}</p>
                    <p className="mt-1 text-sm text-gray-500">{row.basis}</p>
                  </dd>
                </div>
              ))}
            </dl>
            <p>
              Vi bruger ikke dine oplysninger til automatiske afgørelser eller profilering med retsvirkning. Forslag til buddies beregnes ud fra
              fælles interesser og afstand, og det er altid dig, der vælger, om du vil tage kontakt.
            </p>
          </Section>

          <Section id="synlighed" title="Hvad andre kan se">
            <p>
              GoBuddy handler om at blive fundet, så dele af din profil er synlige for andre:
            </p>
            <ul>
              <li>
                <strong>Alle besøgende</strong>, også uden at være logget ind, kan på siderne for de enkelte interesser se dit fornavn, din by og
                det, du har skrevet om interessen.
              </li>
              <li>
                <strong>Andre brugere</strong> kan desuden se din alder, dit profilbillede, dine interesser og den omtrentlige afstand til dig.
              </li>
              <li>
                <strong>Ingen andre</strong> får vist din e-mail, din præcise position eller dine beskeder, som kun du og modtageren kan læse.
              </li>
            </ul>
          </Section>

          <Section id="modtagere" title="Hvem vi deler med">
            <p>
              Vi sælger eller udlejer aldrig dine oplysninger. Vi bruger en række leverandører (databehandlere) til at drive tjenesten. De må kun
              behandle oplysningerne efter vores instruks. Når data overføres til lande uden for EU, sker det på grundlag af EU-Kommissionens
              standardkontraktbestemmelser eller EU-U.S. Data Privacy Framework.
            </p>
            <dl className="mt-6 divide-y divide-gray-200 border-y border-gray-200">
              {RECIPIENTS.map((r) => (
                <div key={r.name} className="py-4 sm:grid sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
                  <dt className="font-semibold text-gray-900">{r.name}</dt>
                  <dd className="mt-1 sm:mt-0">
                    <p className="text-gray-700">{r.role}</p>
                    <p className="mt-1 text-sm text-gray-500">{r.where}</p>
                  </dd>
                </div>
              ))}
            </dl>
            <p>
              Når kort og adresseopslag hentes fra disse leverandører, modtager de teknisk set din IP-adresse, sådan som det sker ved
              ethvert besøg på en hjemmeside.
            </p>
          </Section>

          <Section id="opbevaring" title="Hvor længe vi gemmer">
            <p>
              Vi gemmer dine oplysninger, så længe du har en profil. Sletter du din konto under Rediger profil, sletter vi med det samme din
              profil, dine interesser, beskeder, opslag, aktiviteter og dit profilbillede, og vi fjerner GoBuddys adgang til en eventuel
              Strava-konto. Beder du os om det på e-mail, sker det senest 30 dage efter. Forbinder du Strava fra, sletter vi din Strava-forbindelse med det samme. Framelder du
              nyhedsbrevet, stopper vi med at sende det med det samme.
            </p>
          </Section>

          <Section id="lokal-lagring" title="Cookies og lokal lagring">
            <p>
              Vi bruger ingen cookies til statistik, sporing eller reklame. Vi gemmer kun det, der er nødvendigt for, at siden virker, i din
              browsers lokale lager:
            </p>
            <ul>
              <li>Din login-session, så du forbliver logget ind.</li>
              <li>Dine svar under oprettelsen, så du kan fortsætte, hvor du slap. Din adgangskode gemmes aldrig her.</li>
            </ul>
            <p>Fordi det er strengt nødvendigt for tjenesten, kræver det ikke samtykke. Du kan altid rydde det i din browser.</p>
          </Section>

          <Section id="rettigheder" title="Dine rettigheder">
            <p>Du har efter databeskyttelsesforordningen ret til at:</p>
            <ul>
              <li>få indsigt i de oplysninger, vi har om dig</li>
              <li>få forkerte oplysninger rettet</li>
              <li>få dine oplysninger slettet</li>
              <li>få behandlingen begrænset eller gøre indsigelse mod den</li>
              <li>få dine oplysninger udleveret i et almindeligt, maskinlæsbart format (dataportabilitet)</li>
              <li>trække et samtykke tilbage, fx til nyhedsbrevet eller Strava, uden at det påvirker den behandling, der allerede er sket</li>
            </ul>
            <p>
              Skriv til <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>, så svarer vi inden for en måned. Meget af det kan du også selv
              gøre under din profil.
            </p>
            <p>
              Er du utilfreds med, hvordan vi behandler dine oplysninger, kan du klage til Datatilsynet, Carl Jacobsens Vej 35, 2500 Valby,{" "}
              <a href="https://www.datatilsynet.dk" target="_blank" rel="noreferrer">
                datatilsynet.dk
              </a>
              .
            </p>
          </Section>

          <Section id="alder" title="Aldersgrænse">
            <p>
              GoBuddy er kun for voksne. Du skal være mindst {MIN_AGE} år for at oprette en profil. Opdager vi en profil, der tilhører en
              person under {MIN_AGE} år, sletter vi den.
            </p>
          </Section>

          <Section id="aendringer" title="Ændringer">
            <p>
              Vi opdaterer denne politik, når vi ændrer, hvordan vi behandler data. Datoen øverst viser, hvornår den sidst blev ændret. Ved
              væsentlige ændringer giver vi dig besked på e-mail.
            </p>
          </Section>
        </article>
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section
      id={id}
      className="scroll-mt-8 mt-14 [&_p]:mt-4 [&_p]:leading-relaxed [&_p]:text-gray-700 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_ul]:text-gray-700 [&_ul]:leading-relaxed [&_ul]:marker:text-green-600 [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-blue-300 [&_a:hover]:decoration-blue-700"
    >
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export const Route = createFileRoute("/privatlivspolitik")({
  component: PrivacyPolicy,
});
