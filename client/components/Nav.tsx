"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };

    getUser();

    // Listen for future auth changes → login/logout updates UI instantly
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <nav className="z-50 flex w-full flex-col items-center justify-between px-8 py-6 md:max-w-7xl md:mx-auto">
      <div className="flex items-center justify-between w-full">
        
        <Link href="/">
          <h1 className="text-2xl theseason">RICHACLE</h1>
        </Link>

        <ul className="hidden md:flex items-center gap-8 text-sm">
          {!user ? (
            <>
              <Link href="/signup"><li className="cursor-pointer hover:opacity-70 transition">Sign Up</li></Link>
              <Link href="/login"><li className="cursor-pointer hover:opacity-70 transition">Log In</li></Link>
            </>
          ) : (
            <>
              <Link href="/dashboard"><li className="cursor-pointer hover:opacity-70 transition">Dashboard</li></Link>
            </>
          )}
        </ul>

        <button
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((s) => !s)}
          className="md:hidden p-2 rounded-md inline-flex items-center justify-center hover:bg-zinc-100"
        >
          {open ? <X width={22} height={22} /> : <Menu width={22} height={22} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="md:hidden w-full z-50 overflow-hidden absolute top-20 bg-black shadow-md mx-4 rounded-md"
          >
            <div className="px-2 py-4">
              <ul className="flex flex-col gap-4 text-base">

                {!user ? (
                  <>
                    <Link href="/signup"><li className="cursor-pointer hover:opacity-70 transition">Sign Up</li></Link>
                    <Link href="/login"><li className="cursor-pointer hover:opacity-70 transition">Log In</li></Link>
                  </>
                ) : (
                  <>
                    <Link href="/dashboard"><li className="cursor-pointer hover:opacity-70 transition">Dashboard</li></Link>
                  </>
                )}

              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
