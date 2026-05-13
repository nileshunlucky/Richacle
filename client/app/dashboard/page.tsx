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
  Plus,
  LoaderCircle,
  MessageCircle,
  X
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import Pricing from "@/components/Pricing";
import * as LightweightCharts from 'lightweight-charts';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
  isDemo?: boolean;
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

interface TradeResultState {
  show: boolean;
  type: 'WIN' | 'LOSS';
  pnl: string;
  details: {
    prompt: string;
    amount: string;
    leverage: string;
    odds: string;
    side: string;
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

const AdvancedChart = memo(function AdvancedChart({ tradeLines, onPriceUpdate, symbol = "BTC/USDT", isDemo = false }: AdvancedChartProps) {
  // 1. Properly typed refs using the imported library types
  const chartInstance = useRef<LightweightCharts.IChartApi | null>(null);
  const seriesRef = useRef<LightweightCharts.ISeriesApi<"Candlestick"> | null>(null);
  const tpFillRef = useRef<LightweightCharts.ISeriesApi<"Baseline"> | null>(null);
  const slFillRef = useRef<LightweightCharts.ISeriesApi<"Baseline"> | null>(null);
  

  const container = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const activeLinesRef = useRef<LightweightCharts.IPriceLine[]>([]);
  const [interval, setInterval] = useState("15m");
  const [isChartReady, setIsChartReady] = useState(false);
  const [futureCandlesBox, setFutureCandlesBox] = useState(44);

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
topFillColor1: isBuy ? 'rgba(0, 230, 118, 0.30)' : 'rgba(0,0,0,0)',
topFillColor2: isBuy ? 'rgba(0, 230, 118, 0.20)' : 'rgba(0,0,0,0)',
      bottomFillColor1: !isBuy ? 'rgba(0, 230, 118, 0.25)' : 'rgba(0,0,0,0)',
      bottomFillColor2: !isBuy ? 'rgba(0, 230, 118, 0.05)' : 'rgba(0,0,0,0)',
      lineVisible: false, 
      priceLineVisible: false, 
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    slFillRef.current = chartInstance.current.addBaselineSeries({
      baseValue: { type: 'price', price: entry },
      topFillColor1: !isBuy ? 'rgba(255, 23, 68, 0.30)' : 'rgba(0,0,0,0)',
      topFillColor2: !isBuy ? 'rgba(255, 23, 68, 0.20)' : 'rgba(0,0,0,0)',
      bottomFillColor1: isBuy ? 'rgba(255, 23, 68, 0.25)' : 'rgba(0,0,0,0)',
      bottomFillColor2: isBuy ? 'rgba(255, 23, 68, 0.05)' : 'rgba(0,0,0,0)',
      lineVisible: false,
      priceLineVisible: false, 
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    const candleData = (seriesRef.current.data() as any);
    if (candleData.length > 0) {
      const intervalMap: Record<string, number> = {
  "1m": 60, "5m": 300, "15m": 900,
  "1h": 3600, "4h": 14400, "1d": 86400
};
const intervalSecs = intervalMap[interval] || 900;
const candleData = seriesRef.current.data() as any[];
const lastRealCandle = candleData.filter((c: any) => c.time <= Math.floor(Date.now() / 1000)).pop();
const startTime = (lastRealCandle?.time || Math.floor(Date.now() / 1000)) as LightweightCharts.UTCTimestamp;
const endTime = (startTime + intervalSecs * futureCandlesBox) as LightweightCharts.UTCTimestamp;

tpFillRef.current.setData([{ time: startTime, value: tp }, { time: endTime, value: tp }]);
slFillRef.current.setData([{ time: startTime, value: sl }, { time: endTime, value: sl }]);
    }

    const eLine = seriesRef.current.createPriceLine({ 
      price: entry, color: isBuy ? '#1e3a8a' : '#FF1744', 
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
  
  let isCurrent = true; // Flag to prevent race conditions
  const binanceSymbol = symbol.replace("/", "").toUpperCase();

  // 1. Immediate Cleanup of existing socket
  if (wsRef.current) {
    wsRef.current.onmessage = null;
    wsRef.current.close();
    wsRef.current = null;
  }

  const restBase = isDemo 
    ? "https://testnet.binancefuture.com/fapi/v1" 
    : "https://fapi.binance.com/fapi/v1";
  
  const wsBase = isDemo 
    ? "stream.binancefuture.com" 
    : "fstream.binance.com";

  type BinanceKline = [number, string, string, string, string, string, number, string, number, string, string, string];

  // 2. Clear current data so the chart doesn't show old candles while loading
  seriesRef.current.setData([]);

  fetch(`${restBase}/klines?symbol=${binanceSymbol}&interval=${interval}&limit=300`)
    .then(res => res.json())
    .then((raw: BinanceKline[]) => {
      // If symbol changed while we were fetching, STOP.
      if (!isCurrent) return;

      const data = raw.map((c: BinanceKline) => ({
        time: (c[0] / 1000) as LightweightCharts.UTCTimestamp, 
        open: parseFloat(c[1]), 
        high: parseFloat(c[2]), 
        low: parseFloat(c[3]), 
        close: parseFloat(c[4])
      }));
      
      if (seriesRef.current) {
        const intervalSecs2 = ({ "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400 })[interval] || 900;
const lastCandle = data[data.length - 1];
const futureCandles = Array.from({ length: futureCandlesBox }, (_, i) => ({
  time: (lastCandle.time + intervalSecs2 * (i + 1)) as LightweightCharts.UTCTimestamp,
  open: lastCandle.close, high: lastCandle.close,
  low: lastCandle.close, close: lastCandle.close,
}));
seriesRef.current.setData([...data, ...futureCandles]);
        chartInstance.current?.timeScale().fitContent();
      }

      if (tradeLines) updateVisuals(tradeLines);

      const socket = new WebSocket(`wss://${wsBase}/ws/${binanceSymbol.toLowerCase()}@kline_${interval}`);
      wsRef.current = socket;

      socket.onmessage = (event) => {
        if (!isCurrent) return; // Ignore if component updated
        
        const k = JSON.parse(event.data).k;
        if (onPriceUpdate) onPriceUpdate(parseFloat(k.c).toFixed(2));
        
        if (seriesRef.current && isChartReady) {
          try {
            const candleTime = (k.t / 1000) as LightweightCharts.UTCTimestamp;
const currentData = seriesRef.current.data() as any[];
const realData = currentData.filter((c: any) => c.time <= candleTime);
const intervalSecs3 = ({ "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400 })[interval] || 900;
const futureCandles2 = Array.from({ length: futureCandlesBox }, (_, i) => ({
  time: (candleTime + intervalSecs3 * (i + 1)) as LightweightCharts.UTCTimestamp,
  open: parseFloat(k.c), high: parseFloat(k.c),
  low: parseFloat(k.c), close: parseFloat(k.c),
}));
seriesRef.current.setData([...realData, ...futureCandles2]);
seriesRef.current.update({
  time: candleTime,
  open: parseFloat(k.o), high: parseFloat(k.h),
  low: parseFloat(k.l), close: parseFloat(k.c),
});
          } catch (e) {
            console.warn("Socket update skipped: Chart re-loading");
          }
        }
      };
    });

  // 3. Cleanup function for the effect
  return () => {
    isCurrent = false;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };
}, [isChartReady, symbol, interval, isDemo]);

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
  const [showMobileTip, setShowMobileTip] = useState(false);

  
const displayPrice = price || "0.00"; 
const entry = parseFloat(displayPrice);

 const toggleMobileTip = () => {
    // Only show tooltip on small screens
    if (window.innerWidth < 768) {
      setShowMobileTip(!showMobileTip)
    }
  }

  const formatUSD = (value: string | number) => {
  if (!value) return "";
  return Number(value).toLocaleString("en-US");
};

// Inside TradeWidget component
const { toWin, roiPercentage } = React.useMemo(() => {
  const amt = parseFloat(amount) || 0;
  const lev = parseFloat(leverage) || 1;
  const targetPrice = parseFloat(tp) || 0;

  if (entry > 0 && targetPrice > 0 && amt > 0) {
    // 1. Calculate the raw price move percentage
    // For BUY: (TP - Entry) / Entry
    // For SELL: (Entry - TP) / Entry
    const isBuy = side.toUpperCase() === "BUY";
    const priceMove = isBuy 
      ? (targetPrice - entry) / entry 
      : (entry - targetPrice) / entry;
    
    // 2. Multiply by leverage for ROI
    const roi = priceMove * lev;
    
    // 3. Calculate Final Amount (Initial + Profit)
    const profit = amt * roi;
    const totalWin = amt + profit;

    return {
      toWin: totalWin.toFixed(2),
      roiPercentage: (roi * 100).toFixed(2) // Converts 0.267 to "267"
    };
  }
  
  return { toWin: "0.00", roiPercentage: "0" };
}, [amount, leverage, tp, entry, side]);
  

useEffect(() => {
  if (disabled) return; 
  if (onPriceChange) {
    onPriceChange({ entry, tp: parseFloat(tp), sl: parseFloat(sl), side });
  }
}, [entry, tp, sl, side, onPriceChange]);

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
            "p-3 transition-all text-left  cursor-pointer",
            side === "SELL" ? "bg-[#FF1744]/20 text-[#FF1744]" : "bg-[#2a2b2b] text-[#d1d1d1] opacity-50 hover:opacity-100"
          )}
        >
          <span className="text-[10px] uppercase opacity-70 block mb-1">SELL</span>
          <div className="text-xl tracking-tighter">{displayPrice}</div>
        </button>
        <button 
          onClick={() => !disabled && setSide("BUY")}
          className={cn(
            "p-3 transition-all text-right cursor-pointer",
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
            Amount
          </div>
          <div className="flex items-center py-2 border-b border-white/10 transition-all">


<input 
  disabled={disabled}
  type="text" 
  inputMode="decimal"
  value={amount ? `$${formatUSD(amount)}` : ''} 
  onChange={(e) => {
    const rawValue = e.target.value.replace(/[^0-9.]/g, '');
    setAmount(rawValue);
  }}
  className="bg-transparent outline-none text-white text-right text-2xl w-full p-0 focus:ring-0"
  placeholder="$0"
/>
</div>
        </div>

        <div className="flex justify-between items-center">
                  <div className="flex justify-between items-center w-full">
                  <div className="flex flex-col gap-1">
    <span >To Win 💵</span>
    {/* Displaying the exact ROI percentage */}
    <span className="text-zinc-500">
      +{roiPercentage}% 
      <span className="text-zinc-500 px-2">
      <Tooltip  open={showMobileTip || undefined}>
                  <TooltipTrigger asChild>
                    <button type="button" className="outline-none">
                      <Info  onClick={toggleMobileTip} size={13} className="text-zinc-600 hover:text-zinc-300 transition-colors" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>ROI (Return on Investment)</p>
                  </TooltipContent>
                </Tooltip>
      </span>
    </span>
  </div> 
                  <span className={cn(
  "text-2xl",
  Number(toWin) < (parseFloat(amount) || 0) ? "text-red-500" : "text-green-500"
)}>
  {toWin ? `$${Number(toWin).toLocaleString("en-US")}` : "$0"}
</span>
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
                type="number" 
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
                  type="number" 
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
                  type="number"   
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
    onAccept({
      symbol,
      side,
      leverage,
      amount,
      tp,
      sl
    });
  }}
            className="flex-1 flex items-center justify-center gap-2 p-2 border-t border-green-700 bg-green-700/20 hover:bg-green-700/30 transition-colors text-green-200 text-xs rounded-l cursor-pointer"
          >
            <Check size={14} /> accept
          </button>
          <button 
            onClick={onReset}
            className="flex-1 flex items-center justify-center gap-2 p-2 border-t border-red-700 bg-red-700/20 hover:bg-red-700/30 transition-colors text-red-200 text-xs rounded-r cursor-pointer"
          >
            x reject
          </button>
        </div>
      )}
    </motion.div>
  );
});

const TradeResultOverlay = ({ 
  type, 
  pnl, 
  symbol, 
  onClose,
  details
}: { 
  type: 'WIN' | 'LOSS', 
  pnl: string, 
  symbol: string, 
  onClose: () => void,
  details: {
    prompt: string,
    amount: string,
    leverage: string,
    odds: string,
    side: string
  }
}) => {
  const isWin = type === 'WIN';
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-xl p-4 md:p-6"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 150 }}
        onClick={onClose}
        className="relative cursor-pointer w-full max-w-[650px] overflow-hidden rounded-[24px] md:rounded-[32px] shadow-[0_32px_120px_-15px_rgba(0,0,0,0.8)]"
        style={{
          backgroundColor: '#000000',
          backgroundImage: isWin 
            ? `radial-gradient(100% 100% at 50% 100%, #004A1A 0%, #001A08 40%, #000804 60%, #000000 90%, transparent 100%)`
            : `radial-gradient(100% 90% at 50% 100%, #7A001B 0%, #4A0010 30%, #1A0508 60%, #000000 90%, transparent 100%)`
        }}
      >
        <div className="relative z-10 p-5 flex flex-col items-center">
          
          {/* Main Content Container: Mobile Stack, Desktop Row */}
          <div className="w-full flex flex-col md:flex-row items-stretch md:items-center overflow-hidden">
            
            {/* LEFT SIDE: Logo & Prompt */}
            <div className="flex-1 p-4 md:p-8 text-left space-y-3">
              <div className="flex items-center gap-3 mb-6 md:mb-10 w-full ">
                <img className="h-6 w-6 md:h-8 md:w-8 opacity-90" src="/logo.png" alt="logo"/>
                <p className="text-xl md:text-2xl text-white font-medium theseason tracking-tight">RICHACLE</p>
              </div>
              <p className="text-white text-xl md:text-2xl font-semibold leading-tight tracking-tight">
                {details.prompt}
              </p>
            </div>

            {/* Separator: Vertical on Desktop, Horizontal on Mobile */}
            <div className="h-px w-full md:h-40 md:w-px bg-white/10  my-2 md:my-0" />

            {/* RIGHT SIDE: Trade Details */}
            <div className="p-4 md:p-8 w-full md:w-64 text-left flex flex-col justify-center">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className={`text-xl md:text-2xl font-bold tracking-tight uppercase ${isWin ? 'text-blue-700' : 'text-red-700'}`}>
                    Traded {details.side}
                  </h4>
                  <div className="flex justify-between items-center text-xs text-zinc-200 font-medium">
                    <span>Amount</span>
                    <span className="tabular-nums font-bold text-white">${details.amount}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-zinc-200 font-medium">
                    <span>Leverage</span>
                    <span className="tabular-nums font-bold text-white">{details.leverage}x</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-zinc-200 font-medium">
                    <span>Odds</span>
                    <span className="tabular-nums font-bold text-white">{details.odds}</span>
                  </div>
                </div>

                <div className="h-px w-full bg-white/10 border-dashed border-zinc-600/20" />
                
                <div className="space-y-1">
                  <span className="text-zinc-200 text-xs font-medium">To {isWin ? 'Win' : 'Loss'}</span>
                  <div className="text-4xl md:text-5xl font-bold tracking-tighter tabular-nums text-[#CFA968]">
                    ${pnl}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
export default function VibeTradingUI() {
  const [isDemo, setIsDemo] = useState(false);
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
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  // Add this near your other state declarations in VibeTradingUI
const [confirmedEntryPrice, setConfirmedEntryPrice] = useState<number | null>(null);
const [lastResearch, setLastResearch] = useState<any>(null);
const [activeTradeParams, setActiveTradeParams] = useState<any>(null);
const [tradeResult, setTradeResult] = useState<TradeResultState | null>(null);
const [selectedModel, setSelectedModel] = useState("grok-4.2");
const [loading, setLoading] = useState(false)
const [isWidgetActive, setIsWidgetActive] = useState(false);
const [isPositionClosed, setIsPositionClosed] = useState(false);
const [isRejected, setIsRejected] = useState(false);

const models = [
  { id: "claude-4.7", name: "Claude Opus 4.7" },
  { id: "gpt-5.4", name: "GPT 5.4" },
  { id: "gemini-3.1", name: "Gemini 3.1 Pro" },
  { id: "grok-4.2", name: "Grok 4.2" },
  { id: "deepseek-v3.2", name: "Deepseek-V3.2" },
]

useEffect(() => {
  if (!isExecuted || !activeLines || !currentPrice || !activeTradeParams) return;

  const price = parseFloat(currentPrice);
  const { tp, sl, side, entry } = activeLines;
  const isBuy = side.toUpperCase() === "BUY";

  const tpHit = isBuy ? price >= tp : price <= tp;
  const slHit = isBuy ? price <= sl : price >= sl;

  if (tpHit || slHit) {
    handleCloseOrder(activeSymbol);

    // CALCULATE ACTUAL PNL
    const exitPrice = tpHit ? tp : sl;
    const priceDiff = Math.abs(exitPrice - entry);
    const percentageChange = priceDiff / entry;
    const calculatedPnl = (
      parseFloat(activeTradeParams.amount) * parseFloat(activeTradeParams.leverage) * percentageChange
    ).toFixed(2);

    setTradeResult({
      show: true,
      type: tpHit ? 'WIN' : 'LOSS',
      pnl: calculatedPnl,
      details: {
        prompt: lastResearch?.research_summary?.substring(0, 60) + "..." || "Trade Executed",
        amount: activeTradeParams.amount,
        leverage: activeTradeParams.leverage,
        odds: lastResearch?.confidence || "0",
        side: side
      }
    });
  }
}, [currentPrice, isExecuted, activeLines, activeSymbol, activeTradeParams]);

      useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setEmail(session?.user?.email || "");
    };
    getUser();
  }, []);

  useEffect(() => {
  if (!isExecuted || !activeLines || !currentPrice) return;

  const price = parseFloat(currentPrice);
  const { tp, sl, side } = activeLines;
  const isBuy = side.toUpperCase() === "BUY";

  // Check if TP hit
  const tpHit = isBuy ? price >= tp : price <= tp;
  // Check if SL hit
  const slHit = isBuy ? price <= sl : price >= sl;

  if (tpHit || slHit) {
    
    // 1. Call your Close API to clean up any remaining orphaned TP/SL orders on Binance
    handleCloseOrder(activeSymbol);

    // 2. Toast Notify
    if(tpHit){
      toast.success(`TAKE PROFIT HIT ${tp}`)
    } else {
      toast.error(`STOP LOSS HIT ${sl}`)
    }

  }
}, [currentPrice, isExecuted, activeLines, activeSymbol]);

  
 useEffect(() => {
  if (!email) return;

  const fetchBinance = async () => {
    try {
      // 1. Fetch User Data (Binance Keys)
      const userRes = await fetch(`https://api.richacle.com/user/${email}`);
      const userData = await userRes.json();
      
      setIsDemo(userData?.binance?.demo);
      setIsConfigLoaded(true);

    } catch (error) {
      console.error("Poll error:", error);
      setIsConfigLoaded(true);
    }
  };

  fetchBinance(); 
}, [email]);

  // Inside VibeTradingUI component
const handleAccept = async (tradeParams: TradeParams) => {
  setActiveTradeParams(tradeParams);
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
    setConfirmedEntryPrice(result.entryPrice);
    setIsExecuted(true);
    setIsPositionClosed(false)
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
                disabled={isPositionClosed || isClosing}
                className={cn(
    " text-left mt-1 transition-opacity",
    (isPositionClosed || isClosing) ? "opacity-40 cursor-not-allowed" : "cursor-pointer underline text-zinc-300 hover:text-zinc-100"
  )}
              >
                {isPositionClosed ? " Position for {symbol} has been closed." : "Click here to close position now."}
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


const handleReject = () => {
  setIsWidgetActive(false);
  setActiveLines(null);
  setIsRejected(true);
};

// Called on full reset (trade closed, new session)
const handleReset = () => {
  setMessages([]);
  setIsSearching(false);
  setPrompt("");
  setIsExecuted(false);
  setActiveLines(null);
  setIsWidgetActive(false);
  setIsRejected(false);
};


  // Inside VibeTradingUI component
const handleCloseOrder = async (symbol: string) => {
  if(isPositionClosed){
    setMessages(prev => [
      ...prev,
      {
        role: "ai",
        content: (
          <div className="text-left p-4">
            Position for {symbol} has already closed.
          </div>
        )
      }
    ]);
    return;
  }
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
    
    // Add a "Closed" message to the chat
    setIsPositionClosed(true)
    setMessages(prev => [
      ...prev,
      {
        role: "ai",
        content: (
          <div className="text-left p-4">
            Position for {symbol} has been closed.
          </div>
        )
      }
    ]);

    setIsWidgetActive(false);
    setActiveLines(null);

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
  if (!prompt.trim() || !email) return;
  setLoading(true)

  const currentPrompt = prompt;
  setMessages((prev) => [...prev, { role: "user", content: currentPrompt }]);
  setPrompt("");
  setIsSearching(true);

  try {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("prompt", currentPrompt);

    const response = await fetch("https://api.richacle.com/api/chat", {
      method: "POST",
      body: formData,
    });

    console.log(response)

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
    const { chat_res, wants_to_trade, trade_data } = result;

    setIsSearching(false);
    setMessages((prev) => [
      ...prev,
      {
        role: "ai",
        content: (
          <div className="space-y-2 flex flex-col">
            <div className="p-3.5 text-zinc-200">
              {chat_res}
            </div>
          </div>
        ),
      },
    ]);

    // If Oracle detected trade intent, show analysis + widget
if (wants_to_trade && trade_data) {
  setLastResearch(trade_data);
  setIsRejected(false);
  setIsWidgetActive(true);

  if (trade_data.symbol) {
    setActiveSymbol(trade_data.symbol);
    setActiveLines({
      entry: parseFloat(trade_data.entry_price || currentPrice || "0"),
      tp: parseFloat(trade_data.take_profit),
      sl: parseFloat(trade_data.stop_loss),
      side: trade_data.side,
    });
  }


  setMessages(prev => [
    ...prev,
    {
      role: "ai",
      content: (
        <div className="p-3.5 text-xl text-zinc-200 flex justify-between items-center w-full">
          <h1 className="font-semibold">Win Rate {trade_data.confidence}%</h1>
          <h1 className="font-light theseason">RICHACLE</h1>
        </div>
      ),
    },
    {
      role: "ai",
      content: (
        <TradeWidget
          initialData={trade_data}
          onPriceChange={setActiveLines}
          onReset={handleReject}
          onAccept={handleAccept}
          disabled={false}
          price={currentPrice}
        />
      ),
    },
  ]);
}

  } catch (error) {
    console.error("Error:", error);
    setIsSearching(false);
    setMessages((prev) => [
      ...prev,
      { role: "ai", content: "Error: Could not connect to the research server." },
    ]);
  } finally {
    setLoading(false)
  }
};

const handleClearMemory = async () => {
  if (!email) return;
  try {
    const formData = new FormData();
    formData.append("email", email);
    await fetch("https://api.richacle.com/api/clear-memory", { method: "POST", body: formData });
    setMessages([])
  } catch {
    toast.error("Failed to New Chat.");
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
        <AdvancedChart isDemo={isDemo} symbol={activeSymbol} tradeLines={activeLines} onPriceUpdate={setCurrentPrice}/>
      </div>
      
{!showAgent && <button 
  onClick={() => setShowAgent(true)}
  className="md:hidden fixed bottom-2 right-6 z-45 p-2 px-3 bg-black text-white border rounded-xl transition-transform"
>
  <MessageCircle />
</button>}
      

      {/* RIGHT SIDE: 30% (Exactly as you wanted it) */}
  <div className={cn(
  "flex-[3] flex flex-col bg-black min-w-[320px] max-w-[450px]  transition-all",
  // Mobile logic: Cover screen if shown, hide if not
  !showAgent ? "hidden md:flex" : "fixed inset-0 z-40 md:relative md:inset-auto"
)}>
<div className="bg-black flex justify-end items-center p-2 px-4 gap-2">
<h1 onClick={handleClearMemory} className="cursor-pointer p-2 text-right"><Plus size={20}/></h1>
{showAgent && <button 
  onClick={() => setShowAgent(false)}
  className="cursor-pointer relative group md:hidden"
>
<X size={20}/>
</button>}
</div>

{messages.length === 0 && (
  <div className="w-full justify-center items-center flex h-full">
    <h1 
      className="text-3xl theseason animate-pulse "
    >
      RICHACLE
    </h1>
  </div>
)}
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
  ? React.cloneElement(msg.content as React.ReactElement<TradeWidgetProps>, { 
      disabled: isTrading || isExecuted || isRejected, 
      onAccept: handleAccept, 
      price: isExecuted && confirmedEntryPrice 
             ? confirmedEntryPrice.toString() 
             : (currentPrice || "0.00") 
    }) 
  : msg.content}
                  </div>
                  
                )}
              </motion.div>
            ))}
            
            {isSearching && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 pl-1 pt-1">
                <span className="relative flex size-3">
  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
  <span className="relative inline-flex size-3 rounded-full bg-white"></span>
</span>
              </motion.div>
            )}

            {isTrading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 pl-1 pt-1">
              <span className="relative flex size-3">
  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
  <span className="relative inline-flex size-3 rounded-full bg-white"></span>
</span> 
                <span className=" text-white/40 animate-pulse">Trading</span>
              </motion.div>
            )}
            {isClosing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 pl-1 pt-1">
              <span className="relative flex size-3">
  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
  <span className="relative inline-flex size-3 rounded-full bg-white"></span>
</span> 
                <span className=" text-white/40 animate-pulse">Closing</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>

        <AnimatePresence>
          { (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="p-4 "
            >
              <div className="relative bg-[#0d0d0d] rounded-2xl border border-white/10 p-4 flex flex-col min-h-[140px] focus-within:border-white/20 transition-all">
                <textarea
                  ref={textareaRef}
                  rows={2}
                  maxLength={500}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Ask Richacle"
                  className="w-full bg-transparent border-none outline-none focus:ring-0 text-[14px] px-0 py-0 resize-none placeholder:text-white/50 text-white "
                />
                <div className="flex justify-between items-center mt-auto">


                <Select value={selectedModel} onValueChange={setSelectedModel}>
  <SelectTrigger className=" border-none bg-transparent p-2 focus:ring-0 focus:ring-offset-0 gap-1 text-[11px] font-semibold text-white/70  hover:text-white transition-colors cursor-pointer outline-none">
    <SelectValue />
  </SelectTrigger>
  
  <SelectContent side="top" sideOffset={3} align="start" position="popper"  className="text-white ">
    {models.map((model) => (
      <SelectItem 
        key={model.id} 
        value={model.id}
        className="text-[11px] font-semibold focus:text-white cursor-pointer transition-colors"
      >
        {model.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
                  <button 
                    onClick={handleSend}
                    disabled={!prompt.trim() || loading || isWidgetActive || isTrading || isClosing}
                    className={`p-1.5 bg-white cursor-pointer text-black rounded-full  transition-all active:scale-90 shadow-xl ${!prompt.trim() || loading|| isWidgetActive || isTrading || isClosing ? "opacity-50 hover:opacity-50" : "hover:opacity-80"}`}
                  >
                    {loading || isWidgetActive || isTrading || isClosing ? <LoaderCircle className="animate-spin" size={16} strokeWidth={2.5} /> :  <ArrowUp size={16} strokeWidth={2.5} />}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
        <AnimatePresence>
      {tradeResult?.show && (
        <TradeResultOverlay 
          type={tradeResult.type}
          pnl={tradeResult.pnl}
          symbol={activeSymbol}
          details={tradeResult.details}
          onClose={() => {
            setTradeResult(null);
            handleReset(); // Reset the main UI after closing result
          }}
        />
      )}
    </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      `}} />
    </div>
  );
}