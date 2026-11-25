"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { MenuIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { GobuddyLogo } from "./GobuddyLogo";
import { useAuth } from "@/contexts/AuthContext";
import { isBrowser } from "@/lib/ssr-utils";
import { useUserProfileStore } from "@/store/userProfile";

// Initials for the avatar fallback, e.g. "Jesper Klitgaard" -> "JK"
const getInitials = (name?: string) =>
  name
    ?.split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

interface UserMenuProps {
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  isAdmin?: boolean;
  handleLogout?: () => void;
}

// User menu (signed in) or login button (signed out)
const UserMenu = ({ userName, userEmail, userAvatar, isAdmin, handleLogout }: UserMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        className="h-10 w-10 rounded-full p-0 ring-2 ring-green-500 ring-offset-2 ring-offset-white transition-shadow hover:bg-transparent hover:ring-green-600 data-[state=open]:ring-green-600 dark:ring-offset-black"
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={userAvatar} alt={userName} />
          <AvatarFallback className="bg-blue-500 text-sm font-semibold text-white">{getInitials(userName)}</AvatarFallback>
        </Avatar>
        <span className="sr-only">Brugermenu</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuLabel className="font-normal">
        <div className="flex flex-col space-y-1">
          <p className="font-medium leading-none">{userName}</p>
          <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem asChild>
          <Link to="/profile">Min Profil</Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/godaddy">Admin Dashboard</Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => handleLogout?.()}>Log ud</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

// Types
export interface NavbarNavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

export interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  navigationLinks?: NavbarNavItem[];
  userAvatar?: string;
  /** Show the wordmark next to the logo icon */
  logoWithText?: boolean;
  /** Max-width class for the inner container, should match the page content width */
  containerClassName?: string;
}

export const Navbar = React.forwardRef<HTMLElement, NavbarProps>(
  ({ className, navigationLinks = [], userAvatar, logoWithText = false, containerClassName = "max-w-6xl", ...props }, ref) => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const { logout, user, isAdmin } = useAuth();
    const { profile, loadProfile } = useUserProfileStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
      setMobileOpen(false);
      await logout();
      navigate({ to: "/" });
    };

    useEffect(() => {
      if (user && !profile) {
        loadProfile(user);
      }
    }, [user, profile, loadProfile]);

    return (
      <header
        ref={ref}
        className={cn("sticky top-0 z-50 w-full border-b bg-white dark:bg-black [&_*]:no-underline", className)}
        {...props}
      >
        <div className={cn("mx-auto flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8", containerClassName)}>
          {/* Left: mobile menu + logo */}
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <MenuIcon />
                  <span className="sr-only">Åbn menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle>
                    <GobuddyLogo className="h-7 logo" colorLeft="#27d489" colorRight="#2d7bc4" />
                  </SheetTitle>
                  <SheetDescription className="sr-only">Navigation</SheetDescription>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4">
                  {navigationLinks.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileOpen(false)}
                      activeOptions={{ exact: item.href === "/godaddy" }}
                      activeProps={{ className: "bg-accent text-accent-foreground" }}
                      inactiveProps={{ className: "text-muted-foreground" }}
                      className="flex items-center gap-3 rounded-md px-3 py-2 font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            <Link to="/" className="flex items-center">
              <GobuddyLogo
                className={logoWithText ? "h-12 logo" : "h-8 logo"}
                withText={logoWithText}
                colorLeft="#27d489"
                colorRight="#2d7bc4"
              />
            </Link>
          </div>

          {/* Center: desktop navigation */}
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              {navigationLinks.map((item) => (
                <NavigationMenuItem key={item.href}>
                  <NavigationMenuLink asChild>
                    <Link
                      to={item.href}
                      activeOptions={{ exact: item.href === "/godaddy" }}
                      activeProps={{ className: "text-foreground" }}
                      inactiveProps={{ className: "text-muted-foreground" }}
                      className={cn(navigationMenuTriggerStyle(), "gap-2 bg-transparent")}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

          {/* Right: user menu */}
          <div className="flex items-center gap-2">
            {isBrowser && user ? (
              <UserMenu
                userName={profile?.first_name}
                userEmail={profile?.email}
                userAvatar={userAvatar}
                isAdmin={isAdmin}
                handleLogout={handleLogout}
              />
            ) : (
              <Button asChild size="sm">
                <Link to="/login">Log ind</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
    );
  },
);

Navbar.displayName = "Navbar";

export { UserMenu };
