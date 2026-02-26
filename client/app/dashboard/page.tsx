"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  // --- State ---
  const [email, setEmail] = useState("");
  const [totalPnl, setTotalPnl] = useState(0); // This maps to 'equity' from your API
  const [unrealizedPnl, setUnrealizedPnl] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [prompt, setPrompt] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. Get User Session
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setEmail(session.user.email);
      }
    };
    getUser();
  }, []);

  // 2. Fetch Binance Keys (Required for the balance API)
  useEffect(() => {
    if (!email) return;
    const fetchKeys = async () => {
      try {
        const res = await fetch(`https://api.richacle.com/user/${email}`);
        const data = await res.json();
        setApiKey(data?.binance?.apiKey);
        setApiSecret(data?.binance?.apiSecret);
      } catch (err) {
        console.error("Error fetching keys:", err);
      }
    };
    fetchKeys();
  }, [email]);

  // 3. Real-time PnL Fetching (Polling)
  useEffect(() => {
    if (!email || !apiKey || !apiSecret) return;

    const fetchPnL = async () => {
      try {
        const form = new FormData();
        form.append("email", email);

        const res = await fetch("https://api.richacle.com/api/balance", {
          method: "POST",
          body: form,
        });
        const data = await res.json();

        // Mapping API response to our UI
        setTotalPnl(data?.equity || 0);
        setUnrealizedPnl(data?.unrealized_pnl || 0);
      } catch (error) {
        console.error("PnL Fetch Error:", error);
      }
    };

    fetchPnL(); 
  }, [email, apiKey, apiSecret]);

  // Auto-resize textarea logic
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "inherit";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  return (
    <div className="flex flex-col min-h-screen bg-[#191a1a] text-white font-sans selection:bg-cyan-500/30">
      
      {/* Hero Section: Live API Data */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          key={totalPnl} // Animation triggers on value change
          className="space-y-1"
        >
          <h1 className="text-6xl font-normal tracking-tighter text-[#e8e8e3] animate-pulse">
            ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(totalPnl)}
          </h1>
          
          <div className="flex items-center justify-center gap-2">
            <span className={cn(
              "text-xl font-medium transition-colors duration-500 text-[#39fbff]",
              
            )}>
              {unrealizedPnl >= 0 ? "+" : ""}${unrealizedPnl.toFixed(2)}
            </span>
          </div>
        </motion.div>
      </main>

      {/* Floating UI Input */}
      <div className="w-full max-w-2xl mx-auto p-6 pb-12">
        <div className="relative bg-[#202222] rounded-[32px] p-4 shadow-2xl transition-all">
          <textarea
            ref={textareaRef}
            placeholder="Search Crypto to Trade"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full  resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 py-2 px-3 text-[17px] text-[#e8e8e3] placeholder:text-[#8a8a88]"
          />

          <div className="flex items-center justify-end mt-2">
            

            <button className={cn(
                "h-10 w-10 flex items-center justify-center rounded-full transition-all",
                prompt.trim() ? "bg-white text-black" : "bg-[#39fbff] text-black shadow-[0_0_15px_rgba(57,251,255,0.2)]"
              )}>
             <ArrowUp />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}