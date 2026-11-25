import { Heart, LayoutDashboard, Palette, ScatterChart, User } from "lucide-react";
import { Navbar } from "./Navbar";
const adminNavItems = [
  {
    label: "Dashboard",
    href: "/godaddy",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: "Brugere",
    href: "/godaddy/users",
    icon: <User className="w-5 h-5" />,
  },
  {
    label: "Statistik",
    href: "/godaddy/analytics",
    icon: <ScatterChart className="w-5 h-5" />,
  },
  {
    label: "Interesser",
    href: "/godaddy/interests",
    icon: <Heart className="w-5 h-5" />,
  },
  {
    label: "Design System",
    href: "/godaddy/design-system",
    icon: <Palette className="w-5 h-5" />,
  },
];

/** Admin navbar: same shared navbar with admin links. */
export function NavBarAdmin() {
  return <Navbar navigationLinks={adminNavItems} containerClassName="max-w-7xl" />;
}
