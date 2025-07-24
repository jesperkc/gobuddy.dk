import { useState, useRef } from "react";
import { Link } from "@tanstack/react-router";
// No need to import logo as we'll use a div placeholder
import Logo from "../assets/gobuddy-logo.svg?react";
import { Button } from "./ui/button";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../contexts/AuthContext";
import { useClientEffect, isBrowser } from "../lib/ssr-utils";
// import { useUserProfileStore } from "@/store/userProfile";

export function Navbar() {
  const { user, logout } = useAuth();
  // const { profile } = useUserProfileStore();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    setIsMobileMenuOpen(false);
    navigate({ to: "/" });
  };

  // const toggleMobileMenu = () => {
  //   setIsMobileMenuOpen(!isMobileMenuOpen);
  // };

  // Close dropdown when clicking outside - SSR-safe
  useClientEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }

    if (isBrowser && document) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, []);

  return (
    <nav className="bg-white shadow-xs fixed w-full z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="shrink-0 flex items-center">
            <Link to="/" className="flex items-center">
              <Logo className="logo w-12 h-12" />
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/home" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
              Hjem
            </Link>
            <Link to="/" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
              Find venner
            </Link>
          </div>

          {/* Right side - Profile or Login */}
          <div className="hidden md:flex items-center">
            {/* SSR-safe user authentication display */}
            {isBrowser && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-hidden"
                >
                  <span className="hidden md:block">{user?.email}</span>
                  <svg
                    className={`h-5 w-5 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 ring-1 ring-black ring-opacity-5">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      Min Profil
                    </Link>
                    <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Log ud
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login">
                <Button variant="outline" size="sm">
                  Log ind
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-hidden focus:bg-gray-100 focus:text-gray-900"
            >
              <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                <path className="inline-flex" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden ${isMobileMenuOpen ? "block" : "hidden"}`} ref={mobileMenuRef}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white shadow-inner">
          <Link
            to="/"
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Hjem
          </Link>
          <Link
            to="/"
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Find venner
          </Link>
          {/* SSR-safe user authentication for mobile menu */}
          {isBrowser && user && (
            <>
              <Link
                to="/profile"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Min Profil
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
              >
                Log ud
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
