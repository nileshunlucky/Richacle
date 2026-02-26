"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

// Bitcoin-only TradingView Symbol Overview Widget
const TradingViewWidget = memo(function TradingViewWidget() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Use a timeout to ensure React has finished rendering the div to the DOM
    const timeoutId = setTimeout(() => {
      if (!container.current) return;

      container.current.innerHTML = ""; // Clear any old versions

      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = JSON.stringify({
        symbols: [["Bitcoin", "BINANCE:BTCUSDT|1M"]],
        chartOnly: false,
        width: "100%",
        height: "300",
        locale: "en",
        colorTheme: "dark",
        autosize: false,
        showVolume: false,
        hideDateRanges: false,
        scalePosition: "right",
        scaleMode: "Normal",
        fontFamily: "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
        fontSize: "10",
        headerFontSize: "medium",
        backgroundColor: "#191a1a",
        widgetFontColor: "#DBDBDB",
        lineWidth: 2,
        lineType: 0,
        isTransparent: true,
      });

      container.current.appendChild(script);
    }, 100); // 100ms delay is the "sweet spot" for TradingView widgets

    // 2. Clean up the timeout if the component unmounts
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="tradingview-widget-container w-full" ref={container} style={{ height: "300px" }}>
      <div className="tradingview-widget-container__widget" style={{ height: "300px" }} />
    </div>
  );
});



export default function Dashboard() {
  const [email, setEmail] = useState("");
  const [totalPnl, setTotalPnl] = useState(0);
  const [unrealizedPnl, setUnrealizedPnl] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [prompt, setPrompt] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) setEmail(session.user.email);
    };
    getUser();
  }, []);

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
        setTotalPnl(data?.equity || 0);
        setUnrealizedPnl(data?.unrealized_pnl || 0);
      } catch (error) {
        console.error("PnL Fetch Error:", error);
      }
    };
    fetchPnL();
  }, [email, apiKey, apiSecret]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "inherit";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  const handleSend = () => {
    if (!prompt.trim()) return;
    setUserMessage(prompt);
    setPrompt("");
    setChatOpen(true);
    setIsSearching(true);
    setShowChart(false);

    setTimeout(() => {
      setShowChart(true);
      setIsSearching(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
    setChatOpen(false);
    setUserMessage("");
    setIsSearching(false);
    setShowChart(false);
  };

  const TradingViewNews = memo(function TradingViewNews() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!container.current) return;
      container.current.innerHTML = "";
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = JSON.stringify({
        displayMode: "regular",
        feedMode: "symbol",
        symbol: "BITSTAMP:BTCUSD",
        colorTheme: "dark",
        isTransparent: true, // Set to true to match your premium UI
        locale: "en",
        width: "100%", // Changed to 100% for mobile responsiveness
        height: "550"
      });
      container.current.appendChild(script);
    }, 200);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="tradingview-widget-container w-full rounded-[24px] overflow-hidden" ref={container}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
});

  return (
    <div className="flex flex-col min-h-screen bg-[#191a1a] text-white font-sans selection:bg-cyan-500/30">
      
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          key="pnl-container"
          className="space-y-1"
        >
          <h1 className="text-6xl font-normal tracking-tighter text-[#e8e8e3]">
            ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(totalPnl)}
          </h1>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl font-medium transition-colors duration-500 text-[#39fbff]">
              {unrealizedPnl >= 0 ? "+" : ""}${unrealizedPnl.toFixed(2)}
            </span>
          </div>
        </motion.div>
      </main>

      <AnimatePresence>
        {!chatOpen && (
          <motion.div
            key="input-bar"
            initial={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="w-full max-w-2xl mx-auto p-6 pb-12"
          >
            <div className="relative bg-[#202222] rounded-[32px] p-4 shadow-2xl">
              <textarea
                ref={textareaRef}
                placeholder="Search Crypto to Trade"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                className="w-full resize-none bg-transparent border-none outline-none focus:ring-0 py-2 px-3 text-[17px] text-[#e8e8e3] placeholder:text-[#8a8a88]"
              />
              <div className="flex items-center justify-end mt-2">
                <button
                  onClick={handleSend}
                  className={cn(
                    "h-10 w-10 flex items-center justify-center rounded-full transition-all",
                    prompt.trim() ? "bg-white text-black" : "bg-[#39fbff] text-black"
                  )}
                >
                  <ArrowUp size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chatOpen && (
          <motion.div
            key="chatbot"
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-0 z-50 bg-[#191a1a] flex flex-col md:mx-auto h-screen md:w-[35%]"
          >
            <div className="flex items-center px-5 pt-5 pb-3">
              <button onClick={handleClose} className="h-9 w-9 flex items-center justify-center rounded-full bg-[#2a2b2b] text-[#8a8a88]">
                <ChevronLeft size={18} />
              </button>
              <span className="ml-3 text-sm text-[#8a8a88]">Close</span>
            </div>

            <div className="flex-1 flex flex-col gap-5 overflow-y-auto px-5 py-2 pb-10">
              <div className="flex justify-end">
                <div className="max-w-[75%] bg-[#2a2b2b] text-[#e8e8e3] px-5 py-3.5 rounded-[22px]">
                  {userMessage}
                </div>
              </div>

              {isSearching && (
                <span className="text-[#8a8a88] text-[13px] font-semibold animate-pulse">RESEARCHING</span>
              )}


             <div className="flex gap-2">
              
            <h1 className="md:text-2xl">Bitcoin Cracks $65,000 Support as Trump’s Tariff Broadside Knocks Risk Assets</h1>
            </div>
            <div className="flex items-center justify-between">
            <p>78% Confident</p>

             <div className="flex items-center gap-1">
             <img className="w-5 h-5" src="/logo.png" alt="logo"/>
            <h1 className="theseason">RICHACLE</h1>
            </div>
            </div>
              <AnimatePresence>
                {showChart && (
                  <motion.div
                    key="chart"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full rounded-[20px] overflow-hidden border border-white/[0.06] flex-shrink-0"
                    style={{ height: "300px" }} // Explicit height
                  >
                    <TradingViewWidget />
                  </motion.div>
                )}

              </AnimatePresence>
                {/* ADD THIS IMMEDIATELY AFTER THE TRADINGVIEW WIDGET DIV */}
<div className="grid grid-cols-3 gap-3 ">
  <button className="flex flex-col items-center p-2 rounded-[22px] bg-green-600/20 border border-green-600 active:scale-95 transition-transform">
    <span className="text-xs font-bold text-green-500 mb-1">Take Profit</span>
    <span className=" font-semibold">92289</span>
  </button>

  <button className="flex justify-center items-center p-2 rounded-[22px] bg-[#39fbff]/10 border border-[#39fbff] active:scale-95 transition-transform">
    <span className="font-bold text-[#39fbff]">BUY</span>
  </button>

  <button className="flex flex-col items-center p-2 rounded-[22px] bg-red-600/20 border border-red-600 active:scale-95 transition-transform">
    <span className="text-xs font-bold text-red-500 mb-1">Stop Loss</span>
    <span className=" font-semibold">92220</span>
  </button>
</div>


              
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}