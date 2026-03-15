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
import Pricing from "@/components/Pricing";
import * as LightweightCharts from 'lightweight-charts';

const cn = (...classes: (string | boolean | undefined | null)[]) => 
  classes.filter(Boolean).join(" ");

interface TradeLines {
  entry: number;
  tp: number;
  sl: number;
  side: string;
}

interface AdvancedChartProps {
  tradeLines: TradeLines | null;
  onPriceUpdate: (price: string) => void;
  symbol?: string;
}

interface TradeWidgetProps {
  onReset: () => void;
  onAccept: (params: any) => void; // Replace 'any' with your specific trade object if possible
  disabled: boolean;
  onPriceChange: (lines: TradeLines) => void;
  price: string | null;
  initialData: {
    side?: string;
    symbol?: string;
    leverage?: number | string;
    take_profit?: number | string;
    stop_loss?: number | string;
    research_summary?: string;
  };
}

interface TradeParams {
  symbol: string;
  side: string;
  leverage: string;
  amount: string;
  tp: string;
  sl: string;
}

interface Message {
  role: "user" | "ai";
  content: string | React.ReactNode;
}

const AdvancedChart = memo(function AdvancedChart({ tradeLines, onPriceUpdate, symbol = "BTC/USDT" }: AdvancedChartProps) {
  // 1. Properly typed refs using the imported library types
  const chartInstance = useRef<LightweightCharts.IChartApi | null>(null);
  const seriesRef = useRef<LightweightCharts.ISeriesApi<"Candlestick"> | null>(null);
  const tpFillRef = useRef<LightweightCharts.ISeriesApi<"Baseline"> | null>(null);
  const slFillRef = useRef<LightweightCharts.ISeriesApi<"Baseline"> | null>(null);

  const container = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const activeLinesRef = useRef<LightweightCharts.IPriceLine[]>([]);
  const [interval, setInterval] = useState("1m");
  const [isChartReady, setIsChartReady] = useState(false);

  const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d"];

  const updateVisuals = (lines: TradeLines | null) => {
    // 2. NO MORE "window.LightweightCharts" check. Just check the refs.
    if (!seriesRef.current || !chartInstance.current) return;

    // CLEAR PREVIOUS LINES & FILLS
    activeLinesRef.current.forEach(line => seriesRef.current?.removePriceLine(line));
    activeLinesRef.current = [];
    if (tpFillRef.current) { chartInstance.current.removeSeries(tpFillRef.current); tpFillRef.current = null; }
    if (slFillRef.current) { chartInstance.current.removeSeries(slFillRef.current); slFillRef.current = null; }

    if (!lines) return;

    const { entry, tp, sl, side } = lines;
    const isBuy = side.toUpperCase() === 'BUY';

    // 3. Use the imported LightweightCharts directly
    tpFillRef.current = chartInstance.current.addBaselineSeries({
      baseValue: { type: 'price', price: entry },
      topFillColor1: isBuy ? 'rgba(0, 230, 118, 0.25)' : 'rgba(0,0,0,0)',
      topFillColor2: isBuy ? 'rgba(0, 230, 118, 0.05)' : 'rgba(0,0,0,0)',
      bottomFillColor1: !isBuy ? 'rgba(0, 230, 118, 0.25)' : 'rgba(0,0,0,0)',
      bottomFillColor2: !isBuy ? 'rgba(0, 230, 118, 0.05)' : 'rgba(0,0,0,0)',
      lineVisible: false, 
      priceLineVisible: false, 
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    slFillRef.current = chartInstance.current.addBaselineSeries({
      baseValue: { type: 'price', price: entry },
      topFillColor1: !isBuy ? 'rgba(255, 23, 68, 0.25)' : 'rgba(0,0,0,0)',
      topFillColor2: !isBuy ? 'rgba(255, 23, 68, 0.05)' : 'rgba(0,0,0,0)',
      bottomFillColor1: isBuy ? 'rgba(255, 23, 68, 0.25)' : 'rgba(0,0,0,0)',
      bottomFillColor2: isBuy ? 'rgba(255, 23, 68, 0.05)' : 'rgba(0,0,0,0)',
      lineVisible: false,
      priceLineVisible: false, 
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    const candleData = (seriesRef.current.data() as any);
    if (candleData.length > 0) {
      const firstTime = candleData[0].time;
      const lastTime = candleData[candleData.length - 1].time;

      tpFillRef.current.setData([{ time: firstTime, value: tp }, { time: lastTime, value: tp }]);
      slFillRef.current.setData([{ time: firstTime, value: sl }, { time: lastTime, value: sl }]);
    }

    const eLine = seriesRef.current.createPriceLine({ 
      price: entry, color: isBuy ? '#3b82f6' : '#FF1744', 
      lineWidth: 2, lineStyle: LightweightCharts.LineStyle.Solid, title: side.toUpperCase() 
    });
    const tLine = seriesRef.current.createPriceLine({ 
      price: tp, color: '#00E676', lineWidth: 2, lineStyle: LightweightCharts.LineStyle.Solid, title: 'TAKE PROFIT' 
    });
    const sLine = seriesRef.current.createPriceLine({ 
      price: sl, color: '#FF1744', lineWidth: 2, lineStyle: LightweightCharts.LineStyle.Solid, title: 'STOP LOSS' 
    });

    activeLinesRef.current = [eLine, tLine, sLine];
  };

  // 4. CLEAN EFFECT: No more script injection
  useEffect(() => {
    if (!container.current) return;

    const chart = LightweightCharts.createChart(container.current, {
      layout: { background: { color: "#000" }, textColor: "#DDD" },
      grid: { vertLines: { color: "rgba(255,255,255,0.05)" }, horzLines: { color: "rgba(255,255,255,0.05)" } },
      width: container.current.clientWidth,
      height: container.current.clientHeight,
      timeScale: { timeVisible: true, borderVisible: false },
      rightPriceScale: { borderVisible: false }
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#00E676", downColor: "#FF1744", borderVisible: false, 
      wickUpColor: "#00E676", wickDownColor: "#FF1744", priceLineColor: "#FFFFFF",
    });

    chartInstance.current = chart;
    seriesRef.current = candleSeries;
    setIsChartReady(true);

    const handleResize = () => {
      if (container.current && chartInstance.current) {
        chartInstance.current.applyOptions({ width: container.current.clientWidth, height: container.current.clientHeight });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstance.current) chartInstance.current.remove();
    };
  }, []);

  useEffect(() => {
    if (!isChartReady || !seriesRef.current) return;
    const binanceSymbol = symbol.replace("/", "").toUpperCase();
    
    if (wsRef.current) wsRef.current.close();

    type BinanceKline = [number, string, string, string, string, string, number, string, number, string, string, string];

fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=300`)
  .then(res => res.json())
  .then((raw: BinanceKline[]) => { // Add the type here
    const data = raw.map((c: BinanceKline) => ({ // Add the type here
      time: (c[0] / 1000) as LightweightCharts.UTCTimestamp, 
      open: parseFloat(c[1]), 
      high: parseFloat(c[2]), 
      low: parseFloat(c[3]), 
      close: parseFloat(c[4])
    }));
    
    if (seriesRef.current) {
      seriesRef.current.setData(data);
      chartInstance.current?.timeScale().fitContent();
    }
     
        
        // Refresh visuals whenever data is loaded to ensure gradients stretch to new data points
        if (tradeLines) updateVisuals(tradeLines);

        const socket = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSymbol.toLowerCase()}@kline_${interval}`);
        wsRef.current = socket;
        socket.onmessage = (event) => {
          const k = JSON.parse(event.data).k;
          if (onPriceUpdate) onPriceUpdate(parseFloat(k.c).toFixed(2));
          seriesRef.current?.update({
    time: (k.t / 1000) as LightweightCharts.UTCTimestamp, 
    open: parseFloat(k.o), 
    high: parseFloat(k.h), 
    low: parseFloat(k.l), 
    close: parseFloat(k.c),
  });
        };
      });
  }, [isChartReady, symbol, interval]);

  useEffect(() => {
    if (isChartReady) updateVisuals(tradeLines);
  }, [tradeLines, isChartReady]);

  return (
    <div className="flex-1 w-full bg-black relative overflow-hidden flex flex-col"> 
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-1 pointer-events-none">
        <h2 className="text-xl font-bold text-white tracking-tighter">{symbol}</h2>
        <div className="flex gap-2 pointer-events-auto">
          {timeframes.map(tf => (
            <button
              key={tf}
              onClick={() => setInterval(tf)}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded border transition-all",
                interval === tf ? "bg-white text-black border-white" : "bg-black/40 text-white/50 border-white/10 hover:border-white/30"
              )}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="absolute inset-0 h-full w-full" ref={container} />
    </div>
  );
});

/**
 * INTERACTIVE TRADE WIDGET COMPONENT (Exact UI preserved)
 */
const TradeWidget = memo(function TradeWidget({ onReset, onAccept, disabled, onPriceChange, price , initialData}: TradeWidgetProps) {
  const [side, setSide] = useState(initialData?.side || "buy"); 
  const [amount, setAmount] = useState("100");
  const [symbol, setSymbol] = useState(initialData?.symbol || "BTC/USDT");
  const [leverage, setLeverage] = useState(initialData?.leverage?.toString() || "10");
  const [tp, setTp] = useState(initialData?.take_profit?.toString() || "");
  const [sl, setSl] = useState(initialData?.stop_loss?.toString() || "");
  const [fixedPrice, setFixedPrice] = useState<string | null>(null);
  

  // This determines what the user actually sees on the buttons
const displayPrice = disabled && fixedPrice ? fixedPrice : price;
const entry = parseFloat(displayPrice || "0");
  

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
    onAccept({
      symbol,
      side,
      leverage,
      amount,
      tp,
      sl
    });
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTrading, setIsTrading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isExecuted, setIsExecuted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [activeLines, setActiveLines] = useState<TradeLines | null>(null);
  const [showAgent, setShowAgent] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [activeSymbol, setActiveSymbol] = useState("BTC/USDT");
  const [showPricing, setShowPricing] = useState(false);

      useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setEmail(session?.user?.email || "");
    };
    getUser();
  }, []);

  // Inside VibeTradingUI component
const handleAccept = async (tradeParams: TradeParams) => {
  setIsTrading(true);
  
  try {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("symbol", tradeParams.symbol);
    formData.append("side", tradeParams.side);
    formData.append("leverage", tradeParams.leverage);
    formData.append("amount", tradeParams.amount);
    formData.append("tp", tradeParams.tp);
    formData.append("sl", tradeParams.sl);

    const response = await fetch("https://api.richacle.com/api/execute-trade", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || "Trade execution failed");
    }

    // Success state
    setIsExecuted(true);
    setMessages(prev => [
      ...prev,
      {
        role: "ai",
        content: (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 flex flex-col gap-2">
            <div className="text-sm font-bold flex items-center gap-2">
              ORDER PLACED SUCCESSFULLY
            </div>
            <button 
                onClick={() => handleCloseOrder(tradeParams.symbol)} 
                className="underline text-left cursor-pointer mt-1"
              >
                Click here to close position now.
              </button>
          </motion.div>
        )
      }
    ]);
  } catch (error) {
    console.error("Trade Error:", error);
    if (error instanceof Error) {
    toast.error(error.message);
  } else {
    toast.error("An unexpected error occurred");
  }
    setIsExecuted(false);
  } finally {
    setIsTrading(false);
  }
};

  const handleReset = () => {
    setMessages([]);
    setIsSearching(false);
    setPrompt("");
    setIsExecuted(false);
    setActiveLines(null);
  };

  // Inside VibeTradingUI component
const handleCloseOrder = async (symbol: string) => {
  setIsClosing(true); // Re-use the trading loading state
  
  try {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("symbol", symbol);

    const response = await fetch("https://api.richacle.com/api/close-position", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || "Failed to close position");
    }

    toast.success(`Position closed: ${symbol}`);
    
    // Add a "Closed" message to the chat
    setMessages(prev => [
      ...prev,
      {
        role: "ai",
        content: (
          <div className="p-4 text-zinc-500">
            Position for {symbol} has been closed.
          </div>
        )
      }
    ]);

    // Cleanup: Reset UI states so user can search again
    setTimeout(() => {
      handleReset();
    }, 3000);

  } catch (error) {
    console.error("Close Error:", error);
    toast.error(error instanceof Error ? error.message : "Failed to close position");
  } finally {
    setIsClosing(false);
  }
};

 // Around line 542
useEffect(() => {
  if (textareaRef.current) {
    const el = textareaRef.current as HTMLTextAreaElement; // Add this type cast
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
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
        content: (
            <div>
              You run out of credits. Please <span onClick={()=> setShowPricing(true)} className="underline cursor-pointer text-zinc-100"> upgrade your plan </span> to continue trading.
            </div>
        ),
      }]);
      toast("You've run out of credits. Please upgrade your plan to continue trading.")
      setShowPricing(true);
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
    console.log(result)
    const aiData = result.data; 

    if (aiData?.symbol) {
      setActiveSymbol(aiData.symbol);
      // Automatically draw the TP/SL lines based on AI prediction
      setActiveLines({
        entry: parseFloat(aiData.entry_price || currentPrice || "0"),
        tp: parseFloat(aiData.take_profit),
        sl: parseFloat(aiData.stop_loss),
        side: aiData.side
      });
    }

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
    {showPricing && (
  <div className="fixed inset-0 w-full h-full z-[9999] bg-black/90 backdrop-blur-md overflow-y-auto">
    {/* Close Button */}
    <button 
      onClick={() => setShowPricing(false)}
      className="fixed top-5 right-10 z-[10000] text-white cursor-pointer"
    >
      ✕
    </button>
    
    <Pricing />
  </div>
)}
      
      {/* LEFT SIDE: 70% (Exactly as you wanted it) */}
      <div className="flex-[7] flex flex-col min-w-0">
        <AdvancedChart symbol={activeSymbol} tradeLines={activeLines} onPriceUpdate={setCurrentPrice}/>
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
            {isClosing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 pl-1 pt-1">
                <span className="uppercase text-white/40 animate-pulse">CLOSING</span>
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