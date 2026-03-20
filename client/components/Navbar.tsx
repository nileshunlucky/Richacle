"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { 
  Plus, 
  ShieldCheck,
  Info,
  Copy,
  Loader2,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import {Switch} from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [email, setEmail] = useState("");
   const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDemo, setIsDemo] = useState(false)
    const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")
  const [loading, setLoading] = useState(false)
  const [totalPnl, setTotalPnl] = useState(0)
const [strategiesPerf, setStrategiesPerf] = useState(0)

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

  const fetchBinance = async () => {
    try {
      // 1. Fetch User Data (Binance Keys)
      const userRes = await fetch(`https://api.richacle.com/user/${email}`);
      const userData = await userRes.json();
      
      setApiKey(userData?.binance?.apiKey);
      setApiSecret(userData?.binance?.apiSecret);
      setIsDemo(userData?.binance?.demo);

    } catch (error) {
      console.error("Poll error:", error);
    }
  };

  fetchBinance(); 
}, [email]);

   const handleBinance = async () => {
    if (!email){
      toast.error("Not authenticated");
      return;
    }

    if (!apiKey || !apiSecret){
      toast.error("Missing Something");
      return;
    }

    try {
      setLoading(true);
      const form = new FormData();
      form.append("email", email);
      form.append("apiKey", apiKey);
      form.append("apiSecret", apiSecret);
      form.append("isDemo", String(isDemo));
      
      const res = await fetch("https://api.richacle.com/api/binance", {
        method: "POST",
        body: form,
      });

      if(res.ok){
        toast("Binance Connected")
        setIsModalOpen(false)
      } else if (res.status === 401) {
   
    toast.error("Invalid Binance API Key or Secret");
  }
    } catch (e) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  if (!email) return;

  const fetchData = async () => {
    try {
      if (apiKey && apiSecret) {
        const form = new FormData();
        form.append("email", email);
        const balRes = await fetch("https://api.richacle.com/api/balance", {
          method: "POST",
          body: form,
        });
        const balData = await balRes.json();

        setTotalPnl(balData?.equity);
        setStrategiesPerf(balData?.unrealized_pnl);
      } else {
        // Optional: clear PNL if keys aren't present
        setTotalPnl(0);
        setStrategiesPerf(0);
      }

    } catch (error) {
      console.error("Poll error:", error);
    }
  };

  fetchData(); 
}, [email, apiKey, apiSecret]);



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


  return (
    // Set to absolute and top-0 so it doesn't push the Dashboard content down
    <nav className="w-full ">
      <div>
        {/* Changed bg-black to bg-transparent */}
        <div className={`flex justify-between md:px-12 px-3 py-3 h-12 items-center ${mobileOpen ? "bg-black" : "bg-transparent"}`}>
          {/* Logo */}
          <Link href="/dashboard" className="flex-shrink-0">
            <img src="/logo.png" alt="Logo" className="h-7 w-7 object-cover" />
          </Link>

           <ul className="flex space-x-6 items-center text-sm font-semibold">
           <li> <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 text-xs text-zinc-200 hover:text-white transition-colors"
                  >
                    <Plus size={14} />Broker
                  </button></li>
           <li>$ {new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalPnl)}</li>
           <li>${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(strategiesPerf)}</li>
           </ul>


  
        </div>
      </div>

       <AnimatePresence>
  {isModalOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsModalOpen(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl text-white"
      >
        {/* Header with Switch */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10  flex items-center justify-center">
              <img className="h-7 w-7" src="https://www.pngall.com/wp-content/uploads/10/Binance-Coin-Crypto-Logo-Transparent.png" alt="binance"/>
            </div>
            <div>
              <h2 className="text-xl font-semibold">Binance</h2>
              <p className="text-sm text-zinc-500">{isDemo ? 'Demo Trading' : 'Live Trading'}</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Switch 
              checked={isDemo} 
              onCheckedChange={setIsDemo} 
            />
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 ml-1">API Key</label>
            <input 
              type="text" 
              value={apiKey}
              onChange={(e)=> setApiKey(e.target.value)}
              placeholder="Enter your API Key"
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-100 transition-colors placeholder:text-zinc-700"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 ml-1">Secret Key</label>
            <input 
              value={apiSecret}
              onChange={(e)=> setApiSecret(e.target.value)}
              type="password" 
              placeholder="Enter your API Secret"
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-100 transition-colors placeholder:text-zinc-700"
            />
          </div>

          {/* IP Address - HIDDEN IF DEMO */}
          {!isDemo && (
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 ml-1 flex items-center gap-2">
                Public IPv4 address
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="outline-none">
                      <Info size={13} className="text-zinc-600 hover:text-zinc-300 transition-colors" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy this IP to Binance's IP restriction setting.</p>
                  </TooltipContent>
                </Tooltip>
              </label>
              <div 
                onClick={()=> navigator.clipboard.writeText("43.204.237.247")} 
                className="w-full flex justify-between items-center bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm cursor-pointer hover:border-zinc-700 transition-colors"
              >
                <span className="text-zinc-400">43.204.237.247</span>
                <Copy size={16} className="text-zinc-500" />
              </div>
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleBinance}
              disabled={loading}
              className="flex-1 flex items-center justify-center bg-zinc-100 text-zinc-950 px-4 py-3 rounded-xl text-sm font-semibold hover:bg-white transition-all active:scale-95"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Connect"}
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