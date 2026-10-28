"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Info, Copy, Loader2, Search, Equal } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SERVER_IP = "15.207.254.109";
const API_BASE = "https://richacle.onrender.com";

const avatarVariants = {
  initial: { opacity: 0, scale: 0.88 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const BinanceIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M16.624 13.9202l2.7175 2.7154-7.353 7.353-7.353-7.352 2.7175-2.7164 4.6355 4.6595 4.6356-4.6595zm4.6366-4.6366L24 12l-2.7154 2.7164L18.5682 12l2.6924-2.7164zm-9.272.001l2.7163 2.6914-2.7164 2.7174v-.001L9.2721 12l2.7164-2.7154zm-9.2722-.001L5.4088 12l-2.6914 2.6924L0 12l2.7164-2.7164zM11.9885.0115l7.353 7.329-2.7174 2.7154-4.6356-4.6356-4.6355 4.6595-2.7174-2.7154 7.353-7.353z" />
  </svg>
);

interface NavbarProps {
  isVerified?: boolean;
}

export default function Navbar({ isVerified = false }: NavbarProps) {
  const pathname = usePathname();

  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [username, setUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [totalPnl, setTotalPnl] = useState(0);

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showMobileTip, setShowMobileTip] = useState(false);

  // Get user session
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setEmail(session?.user?.email || "");
    };
    getUser();
  }, []);

  // Fetch user data (Binance keys, avatar, username)
  useEffect(() => {
    if (!email) return;

    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_BASE}/user/${email}`);
        const data = await res.json();

        setApiKey(data?.binance?.apiKey);
        setApiSecret(data?.binance?.apiSecret);
        setAvatar(data?.avatar);
        setUsername(data?.username);
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    };

    fetchUser();
  }, [email]);

  // Fetch balance
  useEffect(() => {
    if (!email) return;

    const fetchBalance = async () => {
      try {
        if (apiKey && apiSecret) {
          const form = new FormData();
          form.append("email", email);

          const res = await fetch(`${API_BASE}/api/balance`, {
            method: "POST",
            body: form,
          });
          const data = await res.json();

          setTotalPnl(
            data?.equity !== undefined && data?.equity !== null
              ? Number(data.equity)
              : 0
          );
        } else {
          setTotalPnl(0);
        }
      } catch (error) {
        console.error("Failed to fetch balance:", error);
      }
    };

    fetchBalance();
  }, [email, apiKey, apiSecret]);

  // Register user in backend
  useEffect(() => {
    if (!email) return;

    const addUserToBackend = async () => {
      try {
        const form = new FormData();
        form.append("email", email);

        await fetch(`${API_BASE}/add-user`, {
          method: "POST",
          body: form,
        });
      } catch (err) {
        console.error("Failed to add user:", err);
      }
    };

    addUserToBackend();
  }, [email]);

  const promptUpgrade = () => {
  toast("Upgrade your plan to connect Binance.");
  window.location.href = `https://mellvitta.vercel.app/pricing?email=${encodeURIComponent(email)}`;
};

  const handleOpenBinance = () => {
    if (!isVerified) {
      promptUpgrade();
      return;
    }
    setIsModalOpen(true);
  };

  const handleConnectBinance = async () => {
    if (!isVerified) {
      promptUpgrade();
      return;
    }
    if (!email) {
      toast.error("Not authenticated");
      return;
    }
    if (!apiKey || !apiSecret) {
      toast.error("Missing API key or secret");
      return;
    }

    try {
      setLoading(true);

      const form = new FormData();
      form.append("email", email);
      form.append("apiKey", apiKey);
      form.append("apiSecret", apiSecret);

      const res = await fetch(`${API_BASE}/api/binance`, {
        method: "POST",
        body: form,
      });

      if (res.status === 403) {
        promptUpgrade();
        return;
      }
      if (res.ok) {
        toast("Binance Connected");
        setIsModalOpen(false);
      } else if (res.status === 401) {
        toast.error("Invalid Binance API Key or Secret");
      } else {
        toast.error("Could not connect Binance");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const toggleMobileTip = () => {
    // Only on small screens
    if (window.innerWidth < 768) {
      setShowMobileTip((prev) => !prev);
    }
  };

  // Show only on /dashboard
  if (pathname !== "/dashboard") return null;

  return (
    <nav className="w-full bg-black">

      {/* Top bar */}
      <div className="flex justify-between md:px-12 px-3 py-3 h-12 items-center bg-transparent">
        {/* Logo */}
        <span className="theseason md:text-2xl text-xl">RICHACLE</span>

        {/* Balance + connect button */}
        <div className="relative">
  <div className="flex gap-2 items-center">
    {isVerified ? (
      <>
        <h1 className="p-1 px-3">
          ${" "}
          {new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(totalPnl)}
        </h1>

        <button
          onClick={handleOpenBinance}
          className="flex cursor-pointer items-center gap-1 p-1 px-2"
        >
          <p className="md:flex hidden">Binance</p>
          <p className="flex md:hidden">
            <BinanceIcon className="h-5 w-5 text-white" />
          </p>
        </button>
      </>
    ) : (
      <button
        onClick={promptUpgrade}
        className="flex items-center cursor-pointer justify-center px-4 py-1.5 text-sm font-medium text-white transition-colors font-semibold"
      >
        Upgrade
      </button>
    )}

    <Link
      href="/dashboard?agent=true"
      className="md:hidden flex font-semibold"
    >
      agent
    </Link>
  </div>
</div>
      </div>

      {/* Connect modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md rounded-3xl p-8 bg-black text-white"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <BinanceIcon className="h-5 w-5 text-white" />
                  <h2 className="text-xl font-semibold">Binance Futures</h2>
                </div>
              </div>

              <div className="space-y-5">
                {/* API key */}
                <div className="space-y-2 gap-1 flex flex-col">
                  <label className="text-xs text-zinc-400 ml-1">API Key</label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API Key"
                    className="w-full bg-black rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-100 transition-colors placeholder:text-zinc-700"
                  />
                </div>

                {/* Secret key */}
                <div className="space-y-2 gap-1 flex flex-col">
                  <label className="text-xs text-zinc-400 ml-1">
                    Secret Key
                  </label>
                  <input
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Enter your API Secret"
                    className="w-full bg-black rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-100 transition-colors placeholder:text-zinc-700"
                  />
                </div>

                {/* IP address */}
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400 ml-1 flex items-center gap-2">
                    Public IPv4 address
                    <Tooltip open={showMobileTip || undefined}>
                      <TooltipTrigger asChild>
                        <button type="button" className="outline-none">
                          <Info
                            onClick={toggleMobileTip}
                            size={13}
                            className="text-zinc-600 hover:text-zinc-300 transition-colors"
                          />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copy this IP to Binance&apos;s IP restriction setting.</p>
                      </TooltipContent>
                    </Tooltip>
                  </label>

                  <div
                    onClick={() => {
                      navigator.clipboard.writeText(SERVER_IP);
                      toast("IP copied");
                    }}
                    className="w-full flex justify-between items-center bg-black rounded-xl px-4 py-3 text-sm cursor-pointer hover:border-zinc-700 transition-colors"
                  >
                    <span className="text-zinc-100">{SERVER_IP}</span>
                    <Copy size={16} className="text-zinc-500" />
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 cursor-pointer rounded-xl text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConnectBinance}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center bg-zinc-100 text-zinc-950 px-4 py-3 rounded-xl text-sm font-semibold hover:bg-white transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      "Connect"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </nav>
  );
}