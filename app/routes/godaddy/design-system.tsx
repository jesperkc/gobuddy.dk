import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "../../../src/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { InterestBadge } from "@/components/InterestBadge";
import { Toggle } from "@/components/ui/toggle";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bold, Italic, Heart, Star, Check, X, AlertTriangle, Info } from "lucide-react";

/* ─── Section wrapper ─────────────────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold border-b pb-2">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`w-16 h-16 rounded-lg border shadow-sm ${className}`} />
      <span className="text-xs text-gray-600 text-center leading-tight">{name}</span>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────── */
function DesignSystemPage() {
  const [toggleA, setToggleA] = useState(false);
  const [toggleB, setToggleB] = useState(true);
  const [switchVal, setSwitchVal] = useState(true);

  return (
    <AdminShell>
      <div className="space-y-12">
        <div>
          <h1 className="text-4xl font-bold mb-2">Design System</h1>
          <p className="text-gray-500">En oversigt over farver, typografi og komponenter.</p>
        </div>

        {/* ── Theme Colors ──────────────────────────────────────── */}
        <Section title="Temafarver (CSS-variabler)">
          <div className="flex flex-wrap gap-4">
            <Swatch name="background" className="bg-background" />
            <Swatch name="foreground" className="bg-foreground" />
            <Swatch name="primary" className="bg-primary" />
            <Swatch name="secondary" className="bg-secondary" />
            <Swatch name="muted" className="bg-muted" />
            <Swatch name="accent" className="bg-accent" />
            <Swatch name="destructive" className="bg-destructive" />
            <Swatch name="border" className="bg-border" />
            <Swatch name="input" className="bg-input" />
            <Swatch name="ring" className="bg-ring" />
            <Swatch name="card" className="bg-card" />
            <Swatch name="popover" className="bg-popover" />
          </div>
        </Section>

        {/* ── Brand Colors ──────────────────────────────────────── */}
        <Section title="Brand-farver">
          <div className="flex flex-wrap gap-4">
            <Swatch name="brand-green" className="bg-[var(--brand-green)]" />
            <Swatch name="brand-blue" className="bg-[var(--brand-blue)]" />
          </div>
        </Section>

        {/* ── Red Scale ──────────────────────────────────────────── */}
        <Section title="Red-skala">
          <div className="flex flex-wrap gap-3">
            <Swatch name="red-50" className="bg-red-50" />
            <Swatch name="red-100" className="bg-red-100" />
            <Swatch name="red-200" className="bg-red-200" />
            <Swatch name="red-300" className="bg-red-300" />
            <Swatch name="red-400" className="bg-red-400" />
            <Swatch name="red-500" className="bg-red-500" />
            <Swatch name="red-600" className="bg-red-600" />
            <Swatch name="red-700" className="bg-red-700" />
            <Swatch name="red-800" className="bg-red-800" />
            <Swatch name="red-900" className="bg-red-900" />
            <Swatch name="red-950" className="bg-red-950" />
          </div>
        </Section>

        {/* ── Orange Scale ───────────────────────────────────────── */}
        <Section title="Orange-skala">
          <div className="flex flex-wrap gap-3">
            <Swatch name="orange-50" className="bg-orange-50" />
            <Swatch name="orange-100" className="bg-orange-100" />
            <Swatch name="orange-200" className="bg-orange-200" />
            <Swatch name="orange-300" className="bg-orange-300" />
            <Swatch name="orange-400" className="bg-orange-400" />
            <Swatch name="orange-500" className="bg-orange-500" />
            <Swatch name="orange-600" className="bg-orange-600" />
            <Swatch name="orange-700" className="bg-orange-700" />
            <Swatch name="orange-800" className="bg-orange-800" />
            <Swatch name="orange-900" className="bg-orange-900" />
            <Swatch name="orange-950" className="bg-orange-950" />
          </div>
        </Section>

        {/* ── Yellow Scale ───────────────────────────────────────── */}
        <Section title="Yellow-skala">
          <div className="flex flex-wrap gap-3">
            <Swatch name="yellow-50" className="bg-yellow-50" />
            <Swatch name="yellow-100" className="bg-yellow-100" />
            <Swatch name="yellow-200" className="bg-yellow-200" />
            <Swatch name="yellow-300" className="bg-yellow-300" />
            <Swatch name="yellow-400" className="bg-yellow-400" />
            <Swatch name="yellow-500" className="bg-yellow-500" />
            <Swatch name="yellow-600" className="bg-yellow-600" />
            <Swatch name="yellow-700" className="bg-yellow-700" />
            <Swatch name="yellow-800" className="bg-yellow-800" />
            <Swatch name="yellow-900" className="bg-yellow-900" />
            <Swatch name="yellow-950" className="bg-yellow-950" />
          </div>
        </Section>

        {/* ── Brand Green Scale ──────────────────────────────────── */}
        <Section title="Green-skala (brand)">
          <div className="flex flex-wrap gap-3">
            <Swatch name="green-50" className="bg-green-50" />
            <Swatch name="green-100" className="bg-green-100" />
            <Swatch name="green-200" className="bg-green-200" />
            <Swatch name="green-300" className="bg-green-300" />
            <Swatch name="green-400" className="bg-green-400" />
            <Swatch name="green-500" className="bg-green-500" />
            <Swatch name="green-600" className="bg-green-600" />
            <Swatch name="green-700" className="bg-green-700" />
            <Swatch name="green-800" className="bg-green-800" />
            <Swatch name="green-900" className="bg-green-900" />
            <Swatch name="green-950" className="bg-green-950" />
          </div>
        </Section>

        {/* ── Brand Blue Scale ───────────────────────────────────── */}
        <Section title="Blue-skala (brand)">
          <div className="flex flex-wrap gap-3">
            <Swatch name="blue-50" className="bg-blue-50" />
            <Swatch name="blue-100" className="bg-blue-100" />
            <Swatch name="blue-200" className="bg-blue-200" />
            <Swatch name="blue-300" className="bg-blue-300" />
            <Swatch name="blue-400" className="bg-blue-400" />
            <Swatch name="blue-500" className="bg-blue-500" />
            <Swatch name="blue-600" className="bg-blue-600" />
            <Swatch name="blue-700" className="bg-blue-700" />
            <Swatch name="blue-800" className="bg-blue-800" />
            <Swatch name="blue-900" className="bg-blue-900" />
            <Swatch name="blue-950" className="bg-blue-950" />
          </div>
        </Section>

        {/* ── Violet Scale ───────────────────────────────────────── */}
        <Section title="Violet-skala">
          <div className="flex flex-wrap gap-3">
            <Swatch name="violet-50" className="bg-violet-50" />
            <Swatch name="violet-100" className="bg-violet-100" />
            <Swatch name="violet-200" className="bg-violet-200" />
            <Swatch name="violet-300" className="bg-violet-300" />
            <Swatch name="violet-400" className="bg-violet-400" />
            <Swatch name="violet-500" className="bg-violet-500" />
            <Swatch name="violet-600" className="bg-violet-600" />
            <Swatch name="violet-700" className="bg-violet-700" />
            <Swatch name="violet-800" className="bg-violet-800" />
            <Swatch name="violet-900" className="bg-violet-900" />
            <Swatch name="violet-950" className="bg-violet-950" />
          </div>
        </Section>

        {/* ── Pink Scale ─────────────────────────────────────────── */}
        <Section title="Pink-skala">
          <div className="flex flex-wrap gap-3">
            <Swatch name="pink-50" className="bg-pink-50" />
            <Swatch name="pink-100" className="bg-pink-100" />
            <Swatch name="pink-200" className="bg-pink-200" />
            <Swatch name="pink-300" className="bg-pink-300" />
            <Swatch name="pink-400" className="bg-pink-400" />
            <Swatch name="pink-500" className="bg-pink-500" />
            <Swatch name="pink-600" className="bg-pink-600" />
            <Swatch name="pink-700" className="bg-pink-700" />
            <Swatch name="pink-800" className="bg-pink-800" />
            <Swatch name="pink-900" className="bg-pink-900" />
            <Swatch name="pink-950" className="bg-pink-950" />
          </div>
        </Section>

        {/* ── Gray Scale ─────────────────────────────────────────── */}
        <Section title="Gray-skala">
          <div className="flex flex-wrap gap-3">
            <Swatch name="gray-50" className="bg-gray-50" />
            <Swatch name="gray-100" className="bg-gray-100" />
            <Swatch name="gray-200" className="bg-gray-200" />
            <Swatch name="gray-300" className="bg-gray-300" />
            <Swatch name="gray-400" className="bg-gray-400" />
            <Swatch name="gray-500" className="bg-gray-500" />
            <Swatch name="gray-600" className="bg-gray-600" />
            <Swatch name="gray-700" className="bg-gray-700" />
            <Swatch name="gray-800" className="bg-gray-800" />
            <Swatch name="gray-900" className="bg-gray-900" />
            <Swatch name="gray-950" className="bg-gray-950" />
          </div>
        </Section>

        {/* ── Chart Colors ──────────────────────────────────────── */}
        <Section title="Chart-farver">
          <div className="flex flex-wrap gap-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <Swatch key={n} name={`chart-${n}`} className={`bg-chart-${n}`} />
            ))}
          </div>
        </Section>

        {/* ── Typography ────────────────────────────────────────── */}
        <Section title="Typografi">
          <div className="space-y-3">
            <h1>Heading 1 — font-amifer</h1>
            <h2>Heading 2 — font-amifer</h2>
            <h3>Heading 3 — font-amifer</h3>
            <h4>Heading 4 — font-amifer</h4>
            <p className="text-base">Body text (Inter) — Den hurtige brune ræv springer over den dovne hund.</p>
            <p className="text-sm text-muted-foreground">Muted small text — Sekundær beskrivelse.</p>
            <p className="text-xs text-gray-400">Extra small — Metadata og labels.</p>
          </div>
        </Section>

        {/* ── Buttons ───────────────────────────────────────────── */}
        <Section title="Button">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
              <Button variant="glow">Glow</Button>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
              <Button size="icon">
                <Heart className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Button disabled>Disabled</Button>
              <Button variant="outline" disabled>
                Disabled Outline
              </Button>
            </div>
          </div>
        </Section>

        {/* ── Input ─────────────────────────────────────────────── */}
        <Section title="Input">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ds-text">Tekst</Label>
              <Input id="ds-text" placeholder="Indtast tekst..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ds-email">Email</Label>
              <Input id="ds-email" type="email" placeholder="email@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ds-pw">Adgangskode</Label>
              <Input id="ds-pw" type="password" placeholder="••••••" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ds-num">Nummer</Label>
              <Input id="ds-num" type="number" placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ds-search">Søgning</Label>
              <Input id="ds-search" type="search" placeholder="Søg..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ds-disabled">Disabled</Label>
              <Input id="ds-disabled" disabled placeholder="Ikke tilgængelig" />
            </div>
          </div>
        </Section>

        {/* ── Textarea ──────────────────────────────────────────── */}
        <Section title="Textarea">
          <div className="max-w-lg space-y-2">
            <Label htmlFor="ds-ta">Beskrivelse</Label>
            <Textarea id="ds-ta" placeholder="Skriv noget her..." rows={3} />
          </div>
        </Section>

        {/* ── Select ────────────────────────────────────────────── */}
        <Section title="Select">
          <div className="max-w-xs space-y-2">
            <Label>Vælg en mulighed</Label>
            <Select defaultValue="option1">
              <SelectTrigger>
                <SelectValue placeholder="Vælg..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option1">Mulighed 1</SelectItem>
                <SelectItem value="option2">Mulighed 2</SelectItem>
                <SelectItem value="option3">Mulighed 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Section>

        {/* ── Checkbox ──────────────────────────────────────────── */}
        <Section title="Checkbox">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox id="ds-cb1" defaultChecked />
              <Label htmlFor="ds-cb1">Afkrydset</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="ds-cb2" />
              <Label htmlFor="ds-cb2">Ikke afkrydset</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="ds-cb3" disabled />
              <Label htmlFor="ds-cb3" className="text-muted-foreground">
                Disabled
              </Label>
            </div>
          </div>
        </Section>

        {/* ── Radio Group ───────────────────────────────────────── */}
        <Section title="Radio Group">
          <RadioGroup defaultValue="a">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="a" id="ds-ra" />
              <Label htmlFor="ds-ra">Mulighed A</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="b" id="ds-rb" />
              <Label htmlFor="ds-rb">Mulighed B</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="c" id="ds-rc" />
              <Label htmlFor="ds-rc">Mulighed C</Label>
            </div>
          </RadioGroup>
        </Section>

        {/* ── Switch ────────────────────────────────────────────── */}
        <Section title="Switch">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch id="ds-sw" checked={switchVal} onCheckedChange={setSwitchVal} />
              <Label htmlFor="ds-sw">{switchVal ? "Aktiveret" : "Deaktiveret"}</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch disabled />
              <Label className="text-muted-foreground">Disabled</Label>
            </div>
          </div>
        </Section>

        {/* ── Toggle ────────────────────────────────────────────── */}
        <Section title="Toggle">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">Variants</p>
              <div className="flex flex-wrap gap-3">
                <Toggle variant="default" pressed={toggleA} onPressedChange={setToggleA}>
                  <Bold className="h-4 w-4" /> Default
                </Toggle>
                <Toggle variant="outline" pressed={toggleB} onPressedChange={setToggleB}>
                  <Italic className="h-4 w-4" /> Outline
                </Toggle>
                <Toggle variant="blue" pressed>
                  <Star className="h-4 w-4" /> Blue (on)
                </Toggle>
                <Toggle variant="blue">
                  <Star className="h-4 w-4" /> Blue (off)
                </Toggle>
                <Toggle variant="red" pressed>
                  <X className="h-4 w-4" /> Red (on)
                </Toggle>
                <Toggle variant="red">
                  <X className="h-4 w-4" /> Red (off)
                </Toggle>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Sizes</p>
              <div className="flex flex-wrap gap-3 items-center">
                <Toggle variant="outline" size="sm">
                  <Bold className="h-4 w-4" />
                </Toggle>
                <Toggle variant="outline" size="default">
                  <Bold className="h-4 w-4" />
                </Toggle>
                <Toggle variant="outline" size="lg">
                  <Bold className="h-4 w-4" />
                </Toggle>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Badge ─────────────────────────────────────────────── */}
        <Section title="Badge">
          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        </Section>

        {/* ── InterestBadge ────────────────────────────────────── */}
        <Section title="InterestBadge">
          <h3 className="text-sm font-medium text-gray-500">Small (default)</h3>
          <div className="flex flex-wrap gap-3">
            <InterestBadge name="Løb" icon="🏃" />
            <InterestBadge name="Cykling" icon="🚴" variant="shared" />
            <InterestBadge name="Svømning" icon="🏊" variant="muted" />
          </div>
          <h3 className="text-sm font-medium text-gray-500 mt-4">Large (with description)</h3>
          <div className="flex flex-wrap gap-3">
            <InterestBadge name="Løb" description="Motionsløb, trail og marathon" variant="default" size="lg" />
            <InterestBadge name="Cykling" description="Landevej, MTB og gravel" variant="shared" size="lg" />
            <InterestBadge name="Svømning" description="Frisvømning og åbent vand" variant="muted" size="lg" />
          </div>
        </Section>

        {/* ── Dialog ────────────────────────────────────────────── */}
        <Section title="Dialog">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Åbn dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog titel</DialogTitle>
                <DialogDescription>Dette er en eksempel-dialog. Klik udenfor eller tryk Escape for at lukke.</DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline">Annuller</Button>
                <Button>Bekræft</Button>
              </div>
            </DialogContent>
          </Dialog>
        </Section>

        {/* ── Skeleton ──────────────────────────────────────────── */}
        <Section title="Skeleton">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </Section>

        {/* ── Alerts / Banners ──────────────────────────────────── */}
        <Section title="Alerts (eksempler)">
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
              <Info className="h-5 w-5 shrink-0" /> Info: Dette er en informationsbesked.
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              <Check className="h-5 w-5 shrink-0" /> Succes: Alt gik godt!
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
              <AlertTriangle className="h-5 w-5 shrink-0" /> Advarsel: Vær opmærksom.
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <X className="h-5 w-5 shrink-0" /> Fejl: Noget gik galt.
            </div>
          </div>
        </Section>

        {/* ── Spacing & Radius ──────────────────────────────────── */}
        <Section title="Border Radius">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-16 h-16 bg-gray-200 border rounded-sm" />
              <span className="text-xs text-gray-500">sm</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-16 h-16 bg-gray-200 border rounded-md" />
              <span className="text-xs text-gray-500">md</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-16 h-16 bg-gray-200 border rounded-lg" />
              <span className="text-xs text-gray-500">lg</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-16 h-16 bg-gray-200 border rounded-xl" />
              <span className="text-xs text-gray-500">xl</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-16 h-16 bg-gray-200 border rounded-full" />
              <span className="text-xs text-gray-500">full</span>
            </div>
          </div>
        </Section>

        {/* ── Shadows ───────────────────────────────────────────── */}
        <Section title="Shadows">
          <div className="flex flex-wrap gap-6 items-end">
            {(["shadow-sm", "shadow", "shadow-md", "shadow-lg", "shadow-xl"] as const).map((s) => (
              <div key={s} className="flex flex-col items-center gap-1.5">
                <div className={`w-20 h-20 bg-white border rounded-lg ${s}`} />
                <span className="text-xs text-gray-500">{s}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </AdminShell>
  );
}

export const Route = createFileRoute("/godaddy/design-system")({
  component: DesignSystemPage,
});
