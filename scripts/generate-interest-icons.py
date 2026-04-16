#!/usr/bin/env python3
"""
Generate 45 monochrome line-art SVG icons for GoBuddy interests.
Style: 24x24 viewBox, stroke=currentColor, stroke-width=1.75, round caps/joins, fill=none.

Outputs:
  - public/icons/interests/{slug}.svg   (standalone files, for og-images etc.)
  - src/components/interest-icons.tsx   (TypeScript map used by <InterestIcon/>
                                         so colors inherit currentColor inline)
"""
import os
import re

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT_SVG = os.path.join(ROOT, "public", "icons", "interests")
OUT_TS = os.path.join(ROOT, "src", "components", "interest-icons.tsx")
os.makedirs(OUT_SVG, exist_ok=True)

HEAD = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" '
        'stroke="currentColor" stroke-width="1.75" stroke-linecap="round" '
        'stroke-linejoin="round">')
TAIL = "</svg>"

# Danish slug (as stored in interests.slug) -> kebab-case English icon name.
# The icon files and INTEREST_ICON_PATHS keys use the English names so they
# read naturally in code; the interests.icon column stores the same English
# name to address them.
SLUG_TO_ICON_NAME = {
    "badminton": "badminton",
    "bordtennis": "table-tennis",
    "bowling": "bowling",
    "bueskydning": "archery",
    "crossfit": "crossfit",
    "cykling": "biking",
    "dykning": "diving",
    "faegtning": "fencing",
    "fiskeri": "fishing",
    "fitness": "workout",
    "fodbold": "football",
    "golf": "golf",
    "gravelcykling": "gravel-cycling",
    "haandbold": "handball",
    "hockey": "hockey",
    "kajakroning": "kayaking",
    "kampsport": "martial-arts",
    "kano": "canoeing",
    "kitesurfing": "kitesurfing",
    "klatring": "climbing",
    "krolf": "croquet-golf",
    "langrend": "cross-country-skiing",
    "loeb": "running",
    "mountainbiking": "mountain-biking",
    "off-piste-skilob": "backcountry-skiing",
    "padel-tennis": "padel-tennis",
    "petanque": "petanque",
    "ridning": "horseback-riding",
    "roning": "rowing",
    "rulleskojtlob": "inline-skating",
    "sejlads": "sailing",
    "skateboarding": "skateboarding",
    "skiloeb": "skiing",
    "skojtlob": "ice-skating",
    "snowboard": "snowboard",
    "squash": "squash",
    "stand-up-paddle": "stand-up-paddle",
    "styrketraening": "weight-training",
    "surfing": "surfing",
    "svoemning": "swimming",
    "tennis": "tennis",
    "triatlon": "triathlon",
    "vandring": "hiking",
    "windsurfing": "windsurfing",
    "yoga": "yoga",
}

# Each value is the inner SVG markup (without the <svg> wrapper).
ICONS = {
  # Shuttlecock: cone with feathers
  "badminton": '<circle cx="8" cy="16" r="2"/><path d="M9.5 14.5l6-6"/><path d="M14 8l3-3 3 3-3 3"/><path d="M12 10l2 2M14 7l3 3M18 5l2 2"/>',

  # Table tennis paddle + ball
  "bordtennis": '<circle cx="9" cy="9" r="4.5"/><path d="M12.5 12.5l4.5 4.5 2-2-4.5-4.5"/><circle cx="18.5" cy="6" r="1"/>',

  # Bowling pin
  "bowling": '<path d="M12 3c2 0 3 2 3 5s-1 4-1 6 1 3 1 5c0 1.5-1.3 2-3 2s-3-.5-3-2c0-2 1-3 1-5s-1-3-1-6 1-5 3-5z"/><circle cx="12" cy="7" r=".6" fill="currentColor"/>',

  # Archery target with arrow
  "bueskydning": '<circle cx="10" cy="12" r="7"/><circle cx="10" cy="12" r="4"/><circle cx="10" cy="12" r="1.2"/><path d="M13 9l8-5"/><path d="M19 4l2 2M21 6l-2 2"/>',

  # CrossFit: kettlebell
  "crossfit": '<path d="M9 6a3 3 0 0 1 6 0"/><path d="M8 6h8l1.5 3c.6 2 .2 5-1.5 7-1 1.2-2.5 2-4 2s-3-.8-4-2c-1.7-2-2.1-5-1.5-7z"/>',

  # Bicycle
  "cykling": '<circle cx="6" cy="16" r="4"/><circle cx="18" cy="16" r="4"/><path d="M6 16l4-8h5l3 8"/><path d="M10 8h-2"/><path d="M15 8l-1-3h-2"/>',

  # Diving mask
  "dykning": '<path d="M4 10h12a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-3l-1-2h-4l-1 2H4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z"/><path d="M18 13h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2"/>',

  # Fencing: crossed swords
  "faegtning": '<path d="M4 20l8-8"/><path d="M20 20l-8-8"/><path d="M3 17l3 3"/><path d="M21 17l-3 3"/><path d="M12 12l2-8"/><path d="M13 4h2"/>',

  # Fish
  "fiskeri": '<path d="M3 12c3-5 8-6 13-6l4 6-4 6c-5 0-10-1-13-6z"/><circle cx="16" cy="11" r=".6" fill="currentColor"/><path d="M3 12l-2-2M3 12l-2 2"/>',

  # Dumbbell for fitness
  "fitness": '<path d="M4 9v6M2 11v2"/><path d="M20 9v6M22 11v2"/><path d="M6 8v8M18 8v8"/><path d="M6 12h12"/>',

  # Football (soccer ball)
  "fodbold": '<circle cx="12" cy="12" r="9"/><path d="M12 6l4 3-1.5 5h-5L8 9z"/><path d="M12 6V3M14.5 14l2.5 2M9.5 14l-2.5 2M8 9L5 7.5M16 9l3-1.5"/>',

  # Golf: flag on green
  "golf": '<path d="M7 21V4"/><path d="M7 4l10 3-10 3"/><circle cx="7" cy="21" r="1"/>',

  # Gravel cycling (same skeleton, chunkier tires indicated by dashed)
  "gravelcykling": '<circle cx="6" cy="16" r="4"/><circle cx="18" cy="16" r="4"/><path d="M6 16l4-8h5l3 8"/><path d="M10 8h-2"/><path d="M15 8l-1-3h-2"/><path d="M2 16h1M9 13l.5.5M15 13l.5.5M21 16h1"/>',

  # Handball: ball with lines
  "haandbold": '<circle cx="12" cy="12" r="8"/><path d="M4.5 10.5l7 1.5 7-1.5"/><path d="M12 4v16"/><path d="M7 6.5l5 5.5 5-5.5"/>',

  # Hockey stick + puck
  "hockey": '<path d="M4 5l12 12"/><path d="M16 17l4 2"/><ellipse cx="7" cy="20" rx="3" ry="1"/>',

  # Kayak with paddle
  "kajakroning": '<path d="M3 15c3 3 15 3 18 0"/><path d="M6 14l2-2h8l2 2"/><path d="M2 9l6 2M22 9l-6 2"/><circle cx="12" cy="11" r=".8" fill="currentColor"/>',

  # Martial arts: belt knot
  "kampsport": '<path d="M3 12h18"/><path d="M3 15h18"/><path d="M9 12v3M15 12v3"/><path d="M9 10c0-3 2-5 3-5s3 2 3 5"/><path d="M10 15l-1 4h6l-1-4"/>',

  # Canoe
  "kano": '<path d="M3 13c3 3 15 3 18 0"/><path d="M5 13l2-2h10l2 2"/><path d="M9 11V7M15 11V7"/>',

  # Kitesurfing: kite in sky + line + board
  "kitesurfing": '<path d="M5 4l4 5-4 3z"/><path d="M7 9l4 9"/><path d="M9 20h8"/>',

  # Climbing: mountain + figure
  "klatring": '<path d="M3 20l6-10 4 6 3-4 5 8z"/><circle cx="13" cy="6" r="1.5"/><path d="M13 8v4"/><path d="M11 10l4-1"/>',

  # Croquet golf: mallet
  "krolf": '<path d="M4 18h16"/><path d="M12 18V7"/><rect x="7" y="3" width="10" height="4" rx="1"/>',

  # Cross-country skiing: skier
  "langrend": '<circle cx="13" cy="4" r="1.5"/><path d="M12 7l-1 5 2 3-1 4"/><path d="M14 10l2 2 3-1"/><path d="M5 19l14-3"/><path d="M7 21l14-3"/>',

  # Running figure
  "loeb": '<circle cx="14" cy="4" r="1.5"/><path d="M13 7l-2 4 3 2v4"/><path d="M14 13l3-1 2 2"/><path d="M11 11l-3 1-1 3"/>',

  # Mountain bike with mountain
  "mountainbiking": '<path d="M2 17l4-5 3 3 3-4 5 6"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M9 12h3l2 4"/>',

  # Off-piste skiing: skier on slope
  "off-piste-skilob": '<path d="M3 20l18-6"/><circle cx="14" cy="5" r="1.5"/><path d="M13 8l-1 4 2 2-1 3"/><path d="M15 10l3 1 2-2"/>',

  # Padel tennis racket (shorter racket, perforated head)
  "padel-tennis": '<ellipse cx="10" cy="9" rx="5" ry="6"/><circle cx="8" cy="8" r=".5" fill="currentColor"/><circle cx="11" cy="7" r=".5" fill="currentColor"/><circle cx="9" cy="11" r=".5" fill="currentColor"/><circle cx="12" cy="10" r=".5" fill="currentColor"/><path d="M13 13l6 6"/>',

  # Petanque: cluster of boules
  "petanque": '<circle cx="8" cy="14" r="3"/><circle cx="16" cy="14" r="3"/><circle cx="12" cy="9" r="2"/><circle cx="12" cy="18" r=".6" fill="currentColor"/>',

  # Horseback riding: horse head
  "ridning": '<path d="M7 20v-4c0-4 2-7 6-7h2l3-3 1 3-2 2v4c0 2-1 5-4 5"/><path d="M11 9V6l2-2"/><circle cx="15" cy="12" r=".6" fill="currentColor"/>',

  # Rowing: single shell + oars
  "roning": '<path d="M3 14c3 3 15 3 18 0"/><path d="M11 12l2-2 2 2"/><path d="M4 11l6 2M20 11l-6 2"/>',

  # Inline skating: skate with wheels
  "rulleskojtlob": '<path d="M5 10h12l-1 4h-10z"/><path d="M17 7v3"/><circle cx="7" cy="17" r="1.5"/><circle cx="11" cy="17" r="1.5"/><circle cx="15" cy="17" r="1.5"/><path d="M6 14v1M16 14v1"/>',

  # Sailboat
  "sejlads": '<path d="M12 3v14"/><path d="M12 5l6 12h-6z"/><path d="M3 17c3 3 15 3 18 0"/>',

  # Skateboard
  "skateboarding": '<path d="M3 12h18l-1 3H4z"/><circle cx="7" cy="17" r="1.5"/><circle cx="17" cy="17" r="1.5"/>',

  # Skiing: skis + poles
  "skiloeb": '<path d="M7 3l-2 16"/><path d="M17 3l2 16"/><path d="M9 5l8 10"/><path d="M4 20l16 0"/>',

  # Ice skating: skate blade
  "skojtlob": '<path d="M6 6c3 0 4 2 4 4v4l3 2h4"/><path d="M4 17h16"/><path d="M4 20h16"/>',

  # Snowboard
  "snowboard": '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-10 12 12)"/><path d="M9 11v2M15 11v2"/>',

  # Squash racket (oval)
  "squash": '<ellipse cx="9" cy="9" rx="5" ry="6"/><path d="M13 13l6 6"/><path d="M7 7l4 4M11 7l-4 4"/>',

  # Stand up paddle
  "stand-up-paddle": '<path d="M3 17c3 3 15 3 18 0"/><ellipse cx="12" cy="15" rx="7" ry="1.3"/><path d="M16 14V4"/><path d="M14 5h4"/>',

  # Weight training: big barbell
  "styrketraening": '<path d="M3 9v6M5 7v10"/><path d="M21 9v6M19 7v10"/><path d="M5 12h14"/>',

  # Surfing: board + wave
  "surfing": '<path d="M12 3c2 4 2 12 0 16-4-2-6-6-6-8s2-6 6-8z"/><path d="M3 20c2 1 4 1 6 0s4-1 6 0 4 1 6 0"/>',

  # Swimming: swimmer with waves
  "svoemning": '<circle cx="8" cy="6" r="1.5"/><path d="M10 8l3 1 3-2 3 3"/><path d="M3 14c2 2 4 2 6 0s4-2 6 0 4 2 6 0"/><path d="M3 18c2 2 4 2 6 0s4-2 6 0 4 2 6 0"/>',

  # Tennis racket + ball
  "tennis": '<circle cx="9" cy="9" r="5"/><path d="M6 6l6 6M12 6l-6 6"/><path d="M13 13l6 6"/><circle cx="19" cy="6" r="1.2"/>',

  # Triathlon: three combined (swim wave, bike wheel, runner)
  "triatlon": '<circle cx="5" cy="16" r="2.5"/><path d="M8 8c1 1 2 1 3 0s2-1 3 0"/><circle cx="18" cy="16" r="2.5"/><path d="M8 16h7"/><path d="M12 8l1 4"/>',

  # Hiking boot
  "vandring": '<path d="M4 18V8h4v4l6 2 3 1 3 3H4z"/><path d="M4 18h16"/><path d="M8 8h2"/>',

  # Windsurfing: sail + board
  "windsurfing": '<path d="M3 19c3 2 15 2 18 0"/><path d="M8 17l6-14 4 14z"/><path d="M8 17l10 0"/>',

  # Yoga: figure in lotus
  "yoga": '<circle cx="12" cy="6" r="2"/><path d="M12 8v4"/><path d="M7 18c1-4 4-6 5-6s4 2 5 6z"/><path d="M5 19h14"/>',
}

for slug, inner in ICONS.items():
    name = SLUG_TO_ICON_NAME[slug]
    path = os.path.join(OUT_SVG, f"{name}.svg")
    with open(path, "w") as f:
        f.write(HEAD + inner + TAIL + "\n")

# Convert HTML/SVG attribute names to JSX camelCase for inlining.
JSX_RENAMES = {
    "stroke-width": "strokeWidth",
    "stroke-linecap": "strokeLinecap",
    "stroke-linejoin": "strokeLinejoin",
    "fill-rule": "fillRule",
    "clip-rule": "clipRule",
}


def to_jsx(inner: str) -> str:
    out = inner
    for a, b in JSX_RENAMES.items():
        out = re.sub(rf"\b{a}=", f"{b}=", out)
    # Self-closing tags: already self-closing with /> in the source.
    return out


ts_lines = [
    "// AUTO-GENERATED by scripts/generate-interest-icons.py — do not edit by hand.",
    "import type { ReactNode } from \"react\";",
    "",
    "export const INTEREST_ICON_PATHS: Record<string, ReactNode> = {",
]
for slug, inner in ICONS.items():
    name = SLUG_TO_ICON_NAME[slug]
    ts_lines.append(f'  {repr(name)}: (')
    ts_lines.append(f"    <>{to_jsx(inner)}</>")
    ts_lines.append("  ),")
ts_lines.append("};")
ts_lines.append("")

with open(OUT_TS, "w") as f:
    f.write("\n".join(ts_lines))

print(f"Wrote {len(ICONS)} SVG files to {OUT_SVG}")
print(f"Wrote TS map to {OUT_TS}")
