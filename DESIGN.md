# GoBuddy Design System

## 1. Visual Theme & Atmosphere

GoBuddy helps Danes find friends through shared hobbies. The interface is clean and warm — white card surfaces floating on a warm cream page background (`#faf9f7`), light gray borders, and standard Tailwind shadows. The overall feel is modern and minimal, leaning on good typography and clear information hierarchy rather than decorative flourishes.

The typography pairs two voices: **Amifer**, a characterful display typeface loaded from Adobe TypeKit, handles every heading and gives the brand its recognizable personality. **Inter**, a variable-weight workhorse from Google Fonts, handles body copy, labels, navigation, and form fields with quietly excellent legibility. OpenType features (`cv02`, `cv03`, `cv04`, `cv11`) are enabled globally to give Inter subtle character.

The signature interaction is the **glow button** on the landing page — a black CTA with an animated gradient border that pulses and blurs on hover, lifting upward with `translateY(-5px)`. Cards throughout the app use a gentler hover: a slight upward lift (`-translate-y-1`) and a larger shadow (`shadow-lg`). A staggered `cardReveal` entrance animation (fade in + slide up) gives lists a polished feel.

**Key Characteristics:**

- Warm cream page background (`#faf9f7`) with white card surfaces and light gray borders (`border-gray-100`)
- Standard Tailwind shadow scale (`shadow-sm`, `shadow-lg`)
- Amifer for headings, Inter for everything else
- Card hover: `-translate-y-1` + `shadow-lg`
- Glow button CTA with animated gradient border
- `cardReveal` staggered entrance animation on cards
- Portrait-oriented buddy cards in a 4-column grid on desktop
- Blue/violet/gray interest badge palette

## 2. Color Palette & Roles

### Primary Surfaces

- **Warm Cream** (`#faf9f7`, HSL `40 33% 97%`): Page background and nav background (at 80% opacity) — a warm, papery off-white
- **White** (`#ffffff`): Card surfaces
- **Near-Black** (`hsl(0 0% 3.9%)`): Foreground text
- **Dark** (`hsl(0 0% 9%)`): Primary button fill

### Brand Colors

- **Brand Green** (`#27d489`): Logo left hand, glow button gradient start
- **Brand Blue** (`#2d7bc4`): Logo right hand, glow button gradient accent, focus ring base

### Semantic Colors (HSL via CSS variables)

- **Secondary**: `hsl(0 0% 96.1%)` — light gray surface for secondary fills
- **Muted Foreground**: `hsl(0 0% 45.1%)` — gray text for placeholders and captions
- **Destructive**: `hsl(0 84.2% 60.2%)` — red for danger actions
- **Accent**: `hsl(0 0% 96.1%)` — hover background on ghost buttons and nav items

### Tailwind Palette in Use

The app uses **custom brand-derived color scales** defined in `tailwind.config.js`. All standard Tailwind color names are overridden with scales generated from HSL interpolation anchored on the brand colors. Gray uses Tailwind defaults.

| Color    | Hue  | 500 Value   | Role                                  |
| -------- | ---- | ----------- | ------------------------------------- |
| Red      | 0°   | `#d32222`   | Errors, destructive, non-interests    |
| Orange   | 25°  | `#e9680c`   | Warnings, caution states              |
| Yellow   | 48°  | `#e9bc0c`   | Warning banners, highlights           |
| Green    | 154° | `#2ad489` ★ | Brand green, success, Hi5 indicators  |
| Blue     | 209° | `#2e7cc5` ★ | Brand blue, shared interests, avatars |
| Violet   | 265° | `#6e2fc6`   | Related interests                     |
| Pink     | 330° | `#d3227a`   | Accent, decorative                    |

★ = brand color anchor

Each scale provides shades from 50 (lightest) through 950 (darkest). Always use these named scales (e.g. `text-blue-700`, `bg-green-50`) — never use arbitrary hex values.

- **Blue-50/100/700**: Shared interest badges, avatar backgrounds
- **Violet-50/100/700**: Related interest badges
- **Gray-50/100/200/400/500/700/900**: Borders, text hierarchy, backgrounds
- **Green-100/600**: Hi5 sent indicator
- **Red-50/600**: Admin links, destructive states

Preview all colors at `/godaddy/design-system` (admin-only).

### Borders

- **Primary border**: `border-gray-100` — very light gray, used on cards, nav
- **Secondary border**: `border-gray-200` — slightly darker, used on inputs, dividers
- **Input border**: `hsl(0 0% 20%)` — dark border on form inputs

### Shadows

- **Tailwind defaults**: `shadow-sm` on buttons, `shadow-xs` on outline/secondary buttons, `shadow-lg` on card hover
- **Glow button**: Custom multi-layer with animated gradient blur (see Section 4)
- No custom shadow tokens — the app relies on Tailwind's built-in shadow scale

### Focus

- **Focus Ring**: `2px solid #155dfc` (brand blue) with 2px offset — applied globally via `:focus-visible`

## 3. Typography Rules

### Font Stack

- **Display**: `Amifer` via Adobe TypeKit (`https://use.typekit.net/ejg7xnf.css`), fallback `sans-serif`
- **Body/UI**: `Inter` via Google Fonts (variable, weight 100–900, optical sizing 14–32), fallback `system-ui, sans-serif`
- **OpenType on body**: `"cv02", "cv03", "cv04", "cv11"` enabled globally

### Scale

| Role            | Font   | Size    | Weight | Line Height | Context                         |
| --------------- | ------ | ------- | ------ | ----------- | ------------------------------- |
| Hero Heading    | Amifer | 30–36px | 700    | tight       | Landing page headline           |
| Page Heading    | Amifer | 24–30px | 700    | tight       | h1 on interior pages            |
| Section Heading | Amifer | 18–20px | 600    | 1.25        | h2, card-group titles           |
| Card Title      | Amifer | 16–18px | 600    | tight       | h3 inside cards                 |
| Body Large      | Inter  | 18–20px | 400    | 1.40–1.60   | Descriptions, landing page copy |
| Body Standard   | Inter  | 14–16px | 400    | 1.50        | Labels, UI text, form fields    |
| Body Medium     | Inter  | 16px    | 500    | 1.40        | Button labels                   |
| Nav Link        | Inter  | 14–15px | 500    | 1.60        | Navigation links                |
| Caption         | Inter  | 12–14px | 400    | 1.50        | Timestamps, helper text, badges |

### Principles

- **Amifer is only for headings**: Applied to h1–h6 via the `font-amifer` Tailwind utility in a global CSS layer. Body text, labels, and UI elements always use Inter.
- **Weight hierarchy**: 600–700 for headings, 500 for interactive UI (buttons, nav), 400 for body text.
- **Responsive sizing**: Most heading sizes use Tailwind responsive prefixes (`text-3xl sm:text-4xl`) rather than fixed pixel values.

## 4. Component Patterns

### Buttons

Buttons use the `class-variance-authority` (CVA) library for type-safe variants. Default radius is `rounded-md` (6px).

**Primary** — `bg-primary text-primary-foreground shadow-sm hover:bg-primary/90`. Dark fill, white text, slight shadow. Hover dims the background.

**Outline** — `border border-input bg-background shadow-xs hover:bg-accent`. White fill, dark border, hover changes background to accent gray.

**Ghost** — No background, no shadow. Hover adds accent background. Used for inline actions.

**Destructive** — `bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90`. Red fill, white text.

**Glow (CTA)** — Custom CSS class. White background with a `::before` pseudo-element for the border and a `::after` pseudo-element for the animated gradient glow. The gradient cycles through brand green → blue → purple. On hover: `translateY(-5px)`, the glow blurs to 15px and fades to 50% opacity, shifting downward.

### Cards

White surfaces with very light borders:

- Background: `bg-white`
- Border: `border border-gray-100`
- Radius: `rounded-2xl` (16px)
- Hover: `hover:shadow-lg hover:-translate-y-1 transition-all duration-200`
- Entrance: `cardReveal` animation — 0.3s ease-out, fades in + slides up 12px, staggered via `animationDelay`

**Buddy Cards** are portrait-oriented: avatar centered on top (64px circle, `bg-blue-100 text-blue-700` initials), name and age below, location in `text-gray-500`, then interest badges in a centered flex wrap. Grid: `grid-cols-2 lg:grid-cols-4`.

**Event Cards** are content-stacked: title in `text-gray-900`, date/location/participants in `text-gray-500` with lucide icons, interest badges in `bg-blue-50 text-blue-700` pills, creator name in `text-gray-400`. Grid: `grid-cols-1 sm:grid-cols-2`.

### Interest Badges

Pill-shaped (`rounded-full`), 12px text, medium weight. Three color variants:

- **Shared interests**: `bg-blue-50 text-blue-700 ring-1 ring-blue-100`
- **Related interests**: `bg-violet-50 text-violet-700 ring-1 ring-violet-100`
- **Other interests**: `bg-gray-50 text-gray-600 ring-1 ring-gray-100`

### Inputs

- Border: `border-input` (dark gray, `hsl(0 0% 20%)`)
- Radius: `rounded-md`
- Focus: `ring-1 ring-ring`
- Background: transparent
- Placeholder: `text-muted-foreground`

### Navigation

- Fixed to top: `bg-white/80 backdrop-blur-lg`
- Border: `border-b border-gray-100`
- Links: `text-gray-700 hover:text-gray-900`, `font-medium`
- Dropdown: `bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5`
- Mobile: hamburger at `md` breakpoint (768px), `bg-white shadow-inner`

### Avatars

- Background: `bg-blue-100`, text: `text-blue-700`
- Sizes: `h-16 w-16` in buddy cards, `h-7 w-7` in event detail, `h-5 w-5` inline
- Content: first 2 characters of `first_name`, uppercased

### Badges (UI component)

- Base: `rounded-md border px-2.5 py-0.5 text-xs font-semibold`
- Default: dark fill, white text, shadow
- Secondary: light gray fill
- Outline: border only, foreground text

## 5. Layout Principles

### Container

- Max width: `max-w-6xl` (1152px)
- Centered with: `px-4 sm:px-6 lg:px-8`
- Content top padding: `py-20` (80px) to clear the fixed navbar

### Grid Patterns

- **Buddy cards**: `grid-cols-2 lg:grid-cols-4 gap-4`
- **Event cards**: `grid-cols-1 sm:grid-cols-2 gap-4`

### Spacing

Tailwind's default 4px base. Pages use `space-y-6` or `space-y-8` for section spacing within pages.

### Border Radius Scale

| Tailwind Class | Value  | Usage                            |
| -------------- | ------ | -------------------------------- |
| `rounded-sm`   | ~4px   | Focus outlines                   |
| `rounded-md`   | 6px    | Buttons, inputs, dropdowns       |
| `rounded-lg`   | 8px    | Secondary containers, form pills |
| `rounded-xl`   | 12px   | Profile sections, status banners |
| `rounded-2xl`  | 16px   | Buddy cards, event cards         |
| `rounded-full` | 9999px | Interest badges, avatar circles  |

## 6. Depth & Elevation

| Level | Treatment                       | Usage                          |
| ----- | ------------------------------- | ------------------------------ |
| 0     | No shadow                       | Page background, flat sections |
| 1     | `shadow-xs` or `shadow-sm`      | Buttons at rest                |
| 2     | `shadow-lg` + `-translate-y-1`  | Card and button hover          |
| 3     | Custom glow blur animation      | CTA glow button hover          |
| 4     | `2px solid #155dfc`, 2px offset | Keyboard focus ring            |

The shadow system uses Tailwind's defaults. There are no custom shadow tokens. Elevation is conveyed through shadow size changes on hover paired with a subtle upward translation.

## 7. Do's and Don'ts

### Do

- Use `bg-background` (warm cream `#faf9f7`) for page backgrounds and `bg-white` for card surfaces
- Apply `hover:shadow-lg hover:-translate-y-1 transition-all duration-200` to interactive cards
- Use `cardReveal` animation with staggered `animationDelay` on card lists
- Keep Amifer strictly on h1–h6 elements via `font-amifer`
- Use blue-50/700 for shared interests, violet-50/700 for related, gray-50/600 for other
- Use `bg-blue-100 text-blue-700` for avatar initials
- Use `rounded-2xl` (16px) on cards and `rounded-full` on badges

### Don't

- Don't apply Amifer to body text, labels, or button text
- Don't use custom shadows — stick to Tailwind's `shadow-sm`, `shadow-lg` scale
- Don't skip the `cardReveal` entrance animation on card grids
- Don't use hard-coded colors — use the CSS variables via Tailwind classes where possible
- Don't add complex hover transforms (rotation, skew) — the current hover is a simple lift + shadow

## 8. Responsive Behavior

### Breakpoints

| Name   | Width   | Key Behavior                                  |
| ------ | ------- | --------------------------------------------- |
| Mobile | < 640px | Single column, stacked cards, full-width CTAs |
| sm     | 640px+  | 2-column event grid                           |
| md     | 768px+  | Full horizontal nav, expanded content areas   |
| lg     | 1024px+ | 4-column buddy grid                           |

### Collapse Strategy

- **Buddy cards**: 4 cols → 2 cols (never single — they're compact enough to pair)
- **Event cards**: 2 cols → 1 col on narrow mobile
- **Navigation**: Horizontal links → hamburger menu at `md`
- **Landing page**: Side-by-side split (50/50) → stacked (image on top)

### Touch Targets

- Buttons: `h-9` (36px) default, `h-10` large
- Nav links: `px-3 py-2` padding
- Cards: entire card is tappable (wrapped in `<Link>`)

## 9. Quick Reference for Agents

### Color Cheat Sheet

```
Page background:  #faf9f7  (warm cream)
Card background:  #ffffff  (white)
Text:             hsl(0 0% 3.9%)  (near-black)
Muted text:       hsl(0 0% 45.1%) (gray)
Card border:      gray-100
Input border:     hsl(0 0% 20%)

Brand green:      #2ad489  (green-500)
Brand blue:       #2e7cc5  (blue-500)
Focus ring:       #155dfc

Custom color scales (tailwind.config.js):
  red / orange / yellow / green / blue / violet / pink
  Each: 50 → 100 → 200 → 300 → 400 → 500 → 600 → 700 → 800 → 900 → 950

Shared badges:    bg-blue-50 text-blue-700
Related badges:   bg-violet-50 text-violet-700
Other badges:     bg-gray-50 text-gray-600
Avatar:           bg-blue-100 text-blue-700
Hi5 indicator:    bg-green-100 text-green-600
Destructive:      hsl(0 84.2% 60.2%)
```

### Component Recipes

**Standard card:**
`bg-white`, `border border-gray-100`, `rounded-2xl`, `p-5`. Hover: `hover:shadow-lg hover:-translate-y-1 transition-all duration-200`. Animation: `card-reveal` class with `animationDelay`.

**Interest badge (shared):**
Use the `InterestBadge` component (`src/components/InterestBadge.tsx`). Variants: `default` (blue), `shared` (blue + ring), `muted` (gray). Sizes: `sm` (pill), `lg` (with description).
`<InterestBadge name="Løb" icon="🏃" variant="shared" />`

**Primary button:**
`bg-primary text-primary-foreground shadow-sm rounded-md h-9 px-4 py-2`. Hover: `hover:bg-primary/90`.

**Buddy card:**
Portrait grid item. `rounded-2xl border border-gray-100 bg-white p-5`. Avatar: `h-16 w-16 bg-blue-100 text-blue-700`. Name: `font-semibold text-base`. Location: `text-xs text-gray-500`.

**Glow CTA button:**
`glow-button` class. Black background, white text, animated gradient border. Hover: lifts 5px, glow blurs and fades.
