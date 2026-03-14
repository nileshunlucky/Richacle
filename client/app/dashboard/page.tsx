"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowUp, 
  Terminal, 
  Zap, 
  Info, 
  ChevronDown, 
  Repeat2,
  TrendingUp,
  Check,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

/**
 * UTILITY: Conditional Classnames
 */
const cn = (...classes) => classes.filter(Boolean).join(" ");

/**
 * ADVANCED CHART: UI Kept Exactly Same, Updated with Real Binance Data
 */
const AdvancedChart = memo(function AdvancedChart({ tradeLines, onPriceUpdate }) {
  const container = useRef(null);
  const chartInstance = useRef(null);
  const seriesRef = useRef(null);
  const wsRef = useRef(null); // Added for live updates
  const activeLinesRef = useRef([]);
  const tpFillRef = useRef(null);
  const slFillRef = useRef(null);

  const updateVisuals = (lines) => {
    if (!seriesRef.current || !chartInstance.current || !window.LightweightCharts) return;

    activeLinesRef.current.forEach(line => seriesRef.current.removePriceLine(line));
    activeLinesRef.current = [];
    if (tpFillRef.current) { chartInstance.current.removeSeries(tpFillRef.current); tpFillRef.current = null; }
    if (slFillRef.current) { chartInstance.current.removeSeries(slFillRef.current); slFillRef.current = null; }

    if (!lines) return;

    const { entry, tp, sl, side } = lines;
    const currentTime = Math.floor(Date.now() / 1000);

    tpFillRef.current = chartInstance.current.addSeries(window.LightweightCharts.BaselineSeries, {
      baseValue: { type: 'price', price: entry },
      topFillColor1: 'rgba(0, 230, 118, 0.25)',
      topFillColor2: 'rgba(0, 230, 118, 0.02)',
      topLineColor: 'rgba(0, 230, 118, 0.4)',
      bottomFillColor1: 'rgba(0,0,0,0)', bottomFillColor2: 'rgba(0,0,0,0)',
      bottomLineColor: 'rgba(0,0,0,0)',
      priceLineVisible: false, lastValueVisible: false,
    });

    slFillRef.current = chartInstance.current.addSeries(window.LightweightCharts.BaselineSeries, {
      baseValue: { type: 'price', price: entry },
      topFillColor1: 'rgba(0,0,0,0)', topFillColor2: 'rgba(0,0,0,0)',
      topLineColor: 'rgba(0,0,0,0)',
      bottomFillColor1: 'rgba(255, 23, 68, 0.25)',
      bottomFillColor2: 'rgba(255, 23, 68, 0.02)',
      bottomLineColor: 'rgba(255, 23, 68, 0.4)',
      priceLineVisible: false, lastValueVisible: false,
    });

    const dataPoints = [{ time: currentTime - 100000, value: tp }, { time: currentTime + 100000, value: tp }];
    const slDataPoints = [{ time: currentTime - 100000, value: sl }, { time: currentTime + 100000, value: sl }];

    tpFillRef.current.setData(dataPoints);
    slFillRef.current.setData(slDataPoints);

    const eLine = seriesRef.current.createPriceLine({ 
      price: entry, color: side === 'BUY' ? '#3b82f6' : '#FF1744', 
      lineWidth: 2, lineStyle: 0, title: side.toUpperCase() 
    });
    const tLine = seriesRef.current.createPriceLine({ price: tp, color: '#00E676', lineWidth: 2, lineStyle: 0, title: 'TAKE PROFIT' });
    const sLine = seriesRef.current.createPriceLine({ price: sl, color: '#FF1744', lineWidth: 2, lineStyle: 0, title: 'STOP LOSS' });

    activeLinesRef.current = [eLine, tLine, sLine];
  };

  useEffect(() => {
    updateVisuals(tradeLines);
  }, [tradeLines]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js";
    script.async = true;
    script.onload = () => {
      if (!container.current || !window.LightweightCharts) return;
      
      const { createChart, CandlestickSeries } = window.LightweightCharts;

      const chart = createChart(container.current, {
        layout: { background: { color: "#000" }, textColor: "#DDD" },
        grid: { vertLines: { color: "rgba(255,255,255,0.05)" }, horzLines: { color: "rgba(255,255,255,0.05)" } },
        crosshair: {
          horzLine: {
            labelBackgroundColor: '#FFFFFF', // White background for price label
            labelTextColor: '#000000',      // Black text for visibility
          },
        },
        width: container.current.clientWidth,
        height: container.current.clientHeight,
        timeScale: { timeVisible: true, secondsVisible: false }
      });

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#00E676", downColor: "#FF1744", borderVisible: false, 
        wickUpColor: "#00E676", wickDownColor: "#FF1744", 
        priceLineColor: "#FFFFFF", // Current price line color
      });

      chartInstance.current = chart;
      seriesRef.current = candleSeries;

      if (tradeLines) updateVisuals(tradeLines);

      // 1. Fetch Historical
      fetch(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=300`)
        .then(res => res.json())
        .then(raw => {
          const data = raw.map(c => ({
            time: c[0] / 1000, open: parseFloat(c[1]), high: parseFloat(c[2]), low: parseFloat(c[3]), close: parseFloat(c[4])
          }));
          candleSeries.setData(data);
          chart.timeScale().fitContent();
          

          // 2. Start WebSocket for live movement
          if (wsRef.current) wsRef.current.close();
          const socket = new WebSocket(`wss://stream.binance.com:9443/ws/btcusdt@kline_1m`);
          wsRef.current = socket;

          socket.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            const k = msg.k;
            if (onPriceUpdate) onPriceUpdate(parseFloat(k.c).toFixed(2));
            candleSeries.update({
              time: k.t / 1000,
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
            });
          };
        });

      const handleResize = () => chart.applyOptions({ width: container.current.clientWidth, height: container.current.clientHeight });
      window.addEventListener('resize', handleResize);
      const observer = new ResizeObserver(handleResize);
observer.observe(container.current);
    };
    document.head.appendChild(script);

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [onPriceUpdate]);

  return (
    <div className="flex-1 w-full bg-black relative overflow-hidden flex flex-col">    
      <div className="flex-1" ref={container} />
    </div>
  );
});

/**
 * INTERACTIVE TRADE WIDGET COMPONENT (Exact UI preserved)
 */
const TradeWidget = memo(function TradeWidget({ onReset, onAccept, disabled, onPriceChange, price , initialData}) {
  const [side, setSide] = useState(initialData?.side || "buy"); 
  const [amount, setAmount] = useState("100");
  const [symbol, setSymbol] = useState(initialData?.symbol || "BTC/USDT");
  const [leverage, setLeverage] = useState(initialData?.leverage?.toString() || "10");
  const [tp, setTp] = useState(initialData?.take_profit?.toString() || "");
  const [sl, setSl] = useState(initialData?.stop_loss?.toString() || "");
  const [fixedPrice, setFixedPrice] = useState(null);
  

  // This determines what the user actually sees on the buttons
const displayPrice = disabled && fixedPrice ? fixedPrice : price;
const entry = parseFloat(displayPrice || 0);
  

useEffect(() => {
  if (onPriceChange) {
    onPriceChange({ entry, tp: parseFloat(tp), sl: parseFloat(sl), side });
  }
}, [entry, tp, sl, side, onPriceChange, , disabled]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-[#191b1b]/40 rounded-2xl p-4 space-y-4 border border-white/[0.05] shadow-2xl transition-opacity",
        disabled && "opacity-10 pointer-events-none"
      )}
    >
      <div className="grid grid-cols-2 rounded-xl overflow-hidden font-bold border border-white/5">
        <button 
          onClick={() => !disabled && setSide("SELL")}
          className={cn(
            "p-3 transition-all text-left border-r border-white/5",
            side === "SELL" ? "bg-[#FF1744]/20 text-[#FF1744]" : "bg-[#2a2b2b] text-[#d1d1d1] opacity-50 hover:opacity-100"
          )}
        >
          <span className="text-[10px] uppercase opacity-70 block mb-1">SELL</span>
          <div className="text-xl tracking-tighter">{displayPrice}</div>
        </button>
        <button 
          onClick={() => !disabled && setSide("BUY")}
          className={cn(
            "p-3 transition-all text-right",
            side === "BUY" ? "bg-blue-500/20 text-blue-500" : "bg-[#2a2b2b] text-[#d1d1d1] opacity-50 hover:opacity-100"
          )}
        >
          <span className="text-[10px] uppercase opacity-70 block mb-1">BUY</span>
          <div className="text-xl tracking-tighter">{displayPrice}</div>
        </button>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/30 px-1">
            Amount <ChevronDown size={12} />
          </div>
          <div className="flex items-center gap-2 p-2.5 px-3 rounded-lg bg-[#0d0d0d] border border-white/10 focus-within:border-white/20 transition-all">
            <input 
              disabled={disabled}
              type="text" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              className="bg-transparent border-none outline-none text-white text-sm w-full p-0 focus:ring-0"
            /> USDT
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-white/30 px-1">Symbol</label>
            <div className="flex items-center gap-2 p-2.5 px-3 rounded-lg bg-[#0d0d0d] border border-white/10 focus-within:border-white/20">
              <input 
                disabled={true}
                type="text" 
                value={symbol} 
                className="bg-transparent border-none outline-none font-medium text-white text-[13px] w-full p-0 focus:ring-0"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-white/30 px-1">Leverage</label>
            <div className="flex items-center gap-2 p-2.5 px-3 rounded-lg bg-[#0d0d0d] border border-white/10 focus-within:border-white/20">
              <input 
                disabled={disabled}
                type="text" 
                value={leverage} 
                onChange={(e) => setLeverage(e.target.value)}
                className="bg-transparent border-none outline-none text-white text-[13px] w-full p-0 focus:ring-0"
              />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] uppercase text-white/30 px-1">
                Take profit
              </div>
              <div className="flex items-center gap-2 p-2.5 px-3 rounded-lg bg-[#0d0d0d] border border-white/10 focus-within:border-white/20">
                <input 
                  disabled={disabled}
                  type="text" 
                  value={tp} 
                  onChange={(e) => setTp(e.target.value)}
                  className="bg-transparent border-none outline-none text-white text-xs w-full p-0 focus:ring-0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] uppercase text-white/30 px-1">
                Stop loss
              </div>
              <div className="flex items-center gap-2 p-2.5 px-3 rounded-lg bg-[#0d0d0d] border border-white/10 focus-within:border-white/20">
                <input 
                  disabled={disabled}
                  type="text" 
                  value={sl} 
                  onChange={(e) => setSl(e.target.value)}
                  className="bg-transparent border-none outline-none text-white text-xs w-full p-0 focus:ring-0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {!disabled && (
        <div className="flex">
          <button 
            onClick={() => {
    setFixedPrice(price); // Snapshots the live price right now
    onAccept();           // Tells the parent to start the "Trading" state
  }}
            className="flex-1 flex items-center justify-center gap-2 p-2 bg-green-700 hover:bg-green-600 transition-colors text-white text-xs rounded-l cursor-pointer"
          >
            <Check size={14} /> accept
          </button>
          <button 
            onClick={onReset}
            className="flex-1 flex items-center justify-center gap-2 p-2 bg-red-700 hover:bg-red-600 transition-colors text-white text-xs rounded-r cursor-pointer"
          >
            x reject
          </button>
        </div>
      )}
    </motion.div>
  );
});

export default function VibeTradingUI() {
  const [prompt, setPrompt] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isTrading, setIsTrading] = useState(false);
  const [isExecuted, setIsExecuted] = useState(false);
  const textareaRef = useRef(null);
  const chatEndRef = useRef(null);
  const [activeLines, setActiveLines] = useState(null);
  const [showAgent, setShowAgent] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(null);
    const [email, setEmail] = useState("");

      useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setEmail(session?.user?.email || "");
    };
    getUser();
  }, []);

  const handleAccept = () => {
    setIsTrading(true);
    setIsExecuted(true);
    setTimeout(() => {
      setIsTrading(false);
      setMessages(prev => [
        ...prev,
        {
          role: "ai",
          content: (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 flex flex-col gap-2">
              <button onClick={handleReset} className=" text-left text-sm text-zinc-300 hover:opacity-100">
                Your trade has been executed successfully, <br/> Click here to <span className="underline text-zinc-100 cursor-pointer">close order.</span>
              </button>
            </motion.div>
          )
        }
      ]);
    }, 2000);
  };

  const handleReset = () => {
    setMessages([]);
    setIsSearching(false);
    setPrompt("");
    setIsExecuted(false);
    setActiveLines(null);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSearching]);

const handleSend = async () => {
  if (!prompt.trim() || isSearching || !email) return;

  const currentPrompt = prompt;
  setMessages((prev) => [...prev, { role: "user", content: currentPrompt }]);
  setPrompt("");
  setIsSearching(true);

  try {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("prompt", currentPrompt);

    const response = await fetch("https://api.richacle.com/api/search", {
      method: "POST",
      body: formData,
    });

    // 1. Handle Credits Exhausted
    if (response.status === 403) {
      setIsSearching(false);
      setMessages(prev => [...prev, { 
        role: "ai", 
        content: "You've run out of credits. Please upgrade your plan to continue trading." 
      }]);
      return;
    }

    // 2. Handle Other Server Errors (404, 500, etc.)
    if (!response.ok) {
      setIsSearching(false);
      toast.error("Failed to fetch prediction");
      return; // STOP execution here
    }

    // 3. Process Successful Response
    const result = await response.json();
    const aiData = result.data; 

    setIsSearching(false);
    setMessages((prev) => [
      ...prev,
      {
        role: "ai",
        content: (
          <div className="space-y-2">
            <div className="p-3.5 text-zinc-200">
              {aiData?.research_summary}
            </div>
          </div>
        ),
      },
      {
        role: "ai",
        content: (
          <TradeWidget
            initialData={aiData}
            onPriceChange={setActiveLines}
            onReset={handleReset}
            onAccept={handleAccept}
          />
        ),
      },
    ]);

  } catch (error) {
    console.error("Error:", error);
    setIsSearching(false);
    setMessages((prev) => [
      ...prev,
      { role: "ai", content: "Error: Could not connect to the research engine." },
    ]);
  }
};

  return (
    <div className="flex h-[94vh] bg-[#0a0a0a] text-[#d1d1d1] overflow-hidden font-sans select-none">
      
      {/* LEFT SIDE: 70% (Exactly as you wanted it) */}
      <div className="flex-[7] flex flex-col min-w-0">
        <AdvancedChart tradeLines={activeLines} onPriceUpdate={setCurrentPrice}/>
      </div>

      <button 
  onClick={() => setShowAgent(!showAgent)}
  className="md:hidden fixed bottom-2 right-6 z-45 p-2 px-3 bg-black text-white border rounded-xl transition-transform"
>
  {showAgent ? "chart" : "agent"}
</button>

      {/* RIGHT SIDE: 30% (Exactly as you wanted it) */}
  <div className={cn(
  "flex-[3] flex flex-col bg-black min-w-[320px] max-w-[450px]  transition-all",
  // Mobile logic: Cover screen if shown, hide if not
  !showAgent ? "hidden md:flex" : "fixed inset-0 z-40 md:relative md:inset-auto"
)}>
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={i} 
                className={cn("flex flex-col gap-2", msg.role === "user" ? "items-end" : "items-start")}
              >
                {typeof msg.content === 'string' ? (
                  <div className={cn(
                    "max-w-[90%] p-3 text-[13px] leading-relaxed rounded-lg rounded-tr-none",
                    msg.role === "user" ? "bg-[#2a2b2b] text-white" : "bg-transparent text-[#d1d1d1] pl-4"
                  )}>
                    {msg.content}
                  </div>
                ) : (
                  <div className="w-full">
                    {React.isValidElement(msg.content) && msg.content.type === TradeWidget 
                      ? React.cloneElement(msg.content, { disabled: isTrading || isExecuted, onAccept: handleAccept, price: currentPrice }) 
                      : msg.content}
                  </div>
                )}
              </motion.div>
            ))}
            
            {isSearching && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 pl-1 pt-1">
                <span className="uppercase text-white/40 animate-pulse">RESEARCHING</span>
              </motion.div>
            )}

            {isTrading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 pl-1 pt-1">
                <span className="uppercase text-white/40 animate-pulse">TRADING</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>

        <AnimatePresence>
          {(!isSearching && messages.length === 0) && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="p-4 mb-10"
            >
              <div className="relative bg-[#0d0d0d] rounded-2xl border border-white/10 p-4 flex flex-col min-h-[140px] focus-within:border-white/20 transition-all">
                <textarea
                  ref={textareaRef}
                  rows={2}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Ask Richacle"
                  className="w-full bg-transparent border-none outline-none focus:ring-0 text-[14px] px-0 py-0 resize-none placeholder:text-white/50 text-white font-medium"
                />
                
                <div className="flex justify-between items-center mt-auto">
                  <span className="text-[11px] font-bold text-white/70 tracking-widest uppercase">
                    GPT 5.1
                  </span>
                  <button 
                    onClick={handleSend}
                    disabled={!prompt.trim() || isSearching}
                    className="p-1.5 bg-white text-black rounded-full hover:opacity-80 transition-all active:scale-90 shadow-xl"
                  >
                    <ArrowUp size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      `}} />
    </div>
  );
}