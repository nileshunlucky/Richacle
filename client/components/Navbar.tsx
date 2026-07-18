"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { 
  ShieldCheck,
  Info,
  Copy,
  Loader2,
  Search
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

const avatarVariants = {
  initial: { opacity: 0, scale: 0.88 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [email, setEmail] = useState("");
   const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDemo, setIsDemo] = useState(false)
    const [avatar, setAvatar] = useState("")
    const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [totalPnl, setTotalPnl] = useState(0)
const [strategiesPerf, setStrategiesPerf] = useState(0)
 const [showMobileTip, setShowMobileTip] = useState(false);

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
      setAvatar(userData?.avatar);
      setUsername(userData?.username)

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

const toggleMobileTip = () => {
    // Only show tooltip on small screens
    if (window.innerWidth < 768) {
      setShowMobileTip(!showMobileTip)
    }
  }

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


  // show only in /dashboard page
  if (pathname !== "/dashboard") {  
    return null;
  }


  return (
    // Set to absolute and top-0 so it doesn't push the Dashboard content down
    <nav className="w-full bg-black">
      <div>
        {/* Changed bg-black to bg-transparent */}
        <div className={`flex justify-between md:px-12 px-3 py-3 h-12 items-center ${mobileOpen ? "bg-black" : "bg-transparent"}`}>
          {/* Logo */}
          <Link href="/dashboard" className="flex-shrink-0">
            <img src="/logo.png" alt="Logo" className="h-7 w-7 object-cover" />
          </Link>

           <ul className="flex gap-5 items-center text-sm font-semibold">
            <Link href="/explore"><li><Search className="hidden md:flex cursor-pointer font-bold" size={20} /></li></Link>
           <li> <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex cursor-pointer items-center gap-2 text-xs text-zinc-200 hover:text-white transition-colors"
                  >
                    Binance
                  </button></li>
           <li>$ {new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalPnl)}</li>
           <li>${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(strategiesPerf)}</li>

  <li>
  <Link href={`/${username || "dashboard"}`}> <div className="hidden md:flex justify-center  pb-0 cursor-pointer">
  <motion.div variants={avatarVariants} initial="initial" animate="animate">
    <div style={{
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      backgroundImage: `url(${avatar || "/user.png"})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      flexShrink: 0,
    }} />
  </motion.div>
</div> </Link >
  </li>
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
        className="absolute inset-0  backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-md bg-zinc-950 rounded-3xl p-8 bg-black text-white"
      >
        {/* Header with Switch */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">Binance</h2>

          </div>
          <div className="flex flex-col items-center gap-1">
              <p className="text-sm text-zinc-500">{isDemo ? 'Demo' : 'Real'}</p>
            <Switch
            className="cursor-pointer" 
              checked={isDemo} 
              onCheckedChange={setIsDemo} 
            />
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-2 gap-1 flex flex-col">
            <label className="text-xs text-zinc-400 ml-1">API Key</label>
            <input 
              type="text" 
              value={apiKey}
              onChange={(e)=> setApiKey(e.target.value)}
              placeholder="Enter your API Key"
              className="w-full bg-black rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-100 transition-colors placeholder:text-zinc-700"
            />
          </div>
          
          <div className="space-y-2 gap-1 flex flex-col">
            <label className="text-xs text-zinc-400 ml-1">Secret Key</label>
            <input 
              value={apiSecret}
              onChange={(e)=> setApiSecret(e.target.value)}
              type="password" 
              placeholder="Enter your API Secret"
              className="w-full bg-black  rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-100 transition-colors placeholder:text-zinc-700"
            />
          </div>

          {/* IP Address - HIDDEN IF DEMO */}
          {!isDemo && (
            <div className="space-y-2">
              <label className="text-xs text-zinc-400 ml-1 flex items-center gap-2">
                Public IPv4 address
                <Tooltip open={showMobileTip || undefined}>
                  <TooltipTrigger asChild>
                    <button type="button" className="outline-none">
                      <Info onClick={toggleMobileTip} size={13} className="text-zinc-600 hover:text-zinc-300 transition-colors" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy this IP to Binance's IP restriction setting.</p>
                  </TooltipContent>
                </Tooltip>
              </label>
              <div 
                onClick={()=> navigator.clipboard.writeText("15.207.254.109")} 
                className="w-full flex justify-between items-center bg-black rounded-xl px-4 py-3 text-sm cursor-pointer hover:border-zinc-700 transition-colors"
              >
                <span className="text-zinc-100">15.207.254.109</span>
                <Copy size={16} className="text-zinc-500" />
              </div>
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-3 cursor-pointer rounded-xl text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleBinance}
              disabled={loading}
              className="flex-1 flex items-center justify-center bg-zinc-100 text-zinc-950 px-4 py-3 rounded-xl text-sm font-semibold hover:bg-white transition-all active:scale-95 cursor-pointer"
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