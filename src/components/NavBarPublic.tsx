import { Navbar as SharedNavbar, type NavbarNavItem } from "./Navbar";

const navItems: NavbarNavItem[] = [
  { label: "Hjem", href: "/home" },
  { label: "Find buddy", href: "/buddies" },
  { label: "Aktiviteter", href: "/activities" },
  { label: "Feed", href: "/feed" },
  { label: "Beskeder", href: "/chat" },
];

/** Public app navbar. Fixed to the top; page content offsets it with top padding. */
export function NavBarPublic() {
  return <SharedNavbar navigationLinks={navItems} logoWithText className="fixed" />;
}
