// No need to import logo as we'll use a div placeholder
import { useAuth } from "../contexts/AuthContext";
import { useClientEffect } from "../lib/ssr-utils";
import { Heart, LayoutDashboard, Palette, ScatterChart, User } from "lucide-react";
import { useUserProfileStore } from "@/store/userProfile";
import { Navbar } from "./ui/navbar";
// import { useUserProfileStore } from "@/store/userProfile";

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

export function NavBarAdmin() {
  const { user } = useAuth();
  const { profile } = useUserProfileStore();

  // const location = useLocation();
  // const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // const navigate = useNavigate();

  // Load user profile when component mounts (client-side only)
  useClientEffect(() => {
    if (user && !profile) {
      useUserProfileStore.getState().loadProfile(user);
    }
  }, [user, profile]);

  // const handleLogout = async () => {
  //   await logout();
  //   setIsMobileMenuOpen(false);
  //   navigate({ to: "/" });
  // };

  // const toggleMobileMenu = () => {
  //   setIsMobileMenuOpen(!isMobileMenuOpen);
  // };

  return <Navbar navigationLinks={adminNavItems} />;
}
