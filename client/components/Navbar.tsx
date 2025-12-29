"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [email, setEmail] = useState("");

  // Only show navbar on specific pages
  const showNavbar = ["/dashboard", "/strategy", "/backtest", "/pricing"].some((path) =>
    pathname.startsWith(path)
  );

  // Fetch user session
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setEmail(session?.user?.email || "");
    };
    getUser();
  }, []);


useEffect(() => {
  if (!email) return;

  const addUserToBackend = async () => {
    try {
      const form = new FormData();
      form.append("email", email);

      const res = await fetch("https://api.richacle.com/add-user", {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      console.log(data);
    } catch (err) {
      console.error("Failed to add user:", err);
    }
  };

  addUserToBackend();
}, [email]);


  const navLinks = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Pricing", href: "/pricing" },
    { name: "Strategy", href: "/strategy" },
    { name: "Backtest", href: "/backtest" },
  ];

  if (!showNavbar) return null;

  return (
    <nav >
      <div>
        <div className="flex z-50 justify-between px-12 py-3 bg-black h-12 items-center">
          {/* Logo */}
          <Link href="/dashboard" className="flex-shrink-0">
            <img src="/logo.png" alt="Logo" className="h-7 w-7 object-cover rounded-full" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex space-x-6 items-center">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-white hover:text-zinc-300 transition font-medium"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-black/90">
          <div className="px-4 pt-2 pb-4 space-y-2 flex flex-col">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-white hover:bg-white/10 px-3 py-2 rounded transition font-medium"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
