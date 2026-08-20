"use client";

import { memo, useState, useRef, useEffect } from "react";
import GithubIcon from "@/components/icons/github-icon";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  User,
  CreditCard,
  Bell,
  LayoutGrid,
  HelpCircle,
  FileText,
  LogOut,
  Loader2,
} from "lucide-react";

const DROPDOWN_ITEMS = [
  { label: "My Account", icon: User, href: "" },
  { label: "My Plan", icon: CreditCard, href: "" },
  { label: "Notifications", icon: Bell, href: "" },
  { label: "My Apps", icon: LayoutGrid, href: "" },
  { label: "Help", icon: HelpCircle, href: "" },
  { label: "Terms & Policies", icon: FileText, href: "" },
];

function Header() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    setSigningOut(true);
    await signOut();
  };

  return (
    <header className="relative mx-auto flex w-full shrink-0 items-center justify-center py-6">
      <Link href="/" className="flex flex-row items-center gap-3">
        <img
          src="/fullLogo.png"
          alt=""
          className="mx-auto h-7 object-contain"
        />
        <svg
          width="1"
          height="20"
          viewBox="0 0 1 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0.25 0V19.5" stroke="#C2C2C2" strokeWidth="0.5" />
        </svg>
        <span className="mx-auto text-lg font-semibold text-indigo-100">
          CodeWix
        </span>
      </Link>

      <div className="absolute right-3 flex items-center gap-3">
        {/* GitHub stars (hidden on mobile) */}
        <a
          href="https://github.com/mfssecrets/CODEWIX"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center gap-3 rounded-xl border border-indigo-400/30 bg-white/10 px-2 py-2 text-sm font-medium text-indigo-100 backdrop-blur-sm sm:flex"
        >
          <GithubIcon className="h-[18px] w-[18px]" />
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-white">7k stars</span>
          </div>
        </a>

        {/* Auth section */}
        {loading ? (
          <div className="flex items-center justify-center rounded-xl px-3 py-2">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-300" />
          </div>
        ) : user ? (
          /* Signed-in: User dropdown */
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-400/30 bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/15"
            >
              <span className="max-w-[100px] truncate sm:max-w-none">
                {displayName}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-indigo-300 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#1e1b4b]/95 shadow-2xl backdrop-blur-xl">
                <div className="py-1">
                  {DROPDOWN_ITEMS.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        setDropdownOpen(false);
                        // Navigation can be implemented per-item as needed
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-indigo-100 transition-colors hover:bg-white/10"
                    >
                      <item.icon className="h-4 w-4 text-indigo-400" />
                      {item.label}
                    </button>
                  ))}
                  <div className="my-1 border-t border-white/10" />
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-white/10 disabled:opacity-50"
                  >
                    {signingOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Guest: SIGN IN button */
          <Link
            href="/signin"
            className="flex items-center rounded-xl border border-indigo-400/30 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            SIGN IN
          </Link>
        )}
      </div>
    </header>
  );
}

export default memo(Header);