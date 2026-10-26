"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user || null);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 w-full px-6 md:py-7 py-4 md:px-8 transition-all duration-300 ease-in-out ${
        scrolled
          ? "bg-white text-black"
          : "bg-transparent text-white"
      }`}
    >
      <div className="grid w-full grid-cols-3 items-center">
        {/* Left Spacer */}
        <div />

        {/* Centered Logo */}
        <Link href="/" className="justify-self-center text-center">
          <h1 className="theseason text-3xl md:text-4xl">
            RICHACLE
          </h1>
        </Link>

        {/* Authentication */}
        <div className="flex justify-self-end text-sm">
          {!user ? (
            <Link
              href="/login"
              className="transition-opacity hover:opacity-60"
            >
              Log In
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="transition-opacity hover:opacity-60"
            >
              Dashboard
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}