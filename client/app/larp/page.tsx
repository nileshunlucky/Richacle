"use client";

import React, { useState, useEffect, useRef, memo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Menu from "@/components/Menu"
import Navbar from "@/components/Navbar"

import Journal from "@/components/Journal";
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
  X,
  ChartNoAxesColumn,
  Calendar,
  Search ,
  Lock
} from "lucide-react";
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
import { useSearchParams } from "next/navigation";

const avatarVariants = {
  initial: { opacity: 0, scale: 0.88 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const cn = (...classes: (string | boolean | undefined | null)[]) => 
  classes.filter(Boolean).join(" ");

interface TradeLines {
  entry: number;
  tp: number;
  sl: number;
  side: string;
  amount?: number;    // add this
  leverage?: number;  // add this
  startTime?: number;
}

interface AdvancedChartProps {
  tradeLines: TradeLines | null;
  onPriceUpdate: (price: string) => void;
  symbol?: string;
  onIntervalChange?: (interval: string) => void;
  forcedPrice?: number | null; // DEMO
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
  entry: number;
}


interface Message {
  role: "user" | "ai";
  content: string | React.ReactNode;
}

const AdvancedChart = memo(function AdvancedChart({ tradeLines, onPriceUpdate, symbol = "BTC/USDT", onIntervalChange, forcedPrice }: AdvancedChartProps) {
  // 1. Properly typed refs using the imported library types
  const chartInstance = useRef<LightweightCharts.IChartApi | null>(null);
  const seriesRef = useRef<LightweightCharts.ISeriesApi<"Candlestick"> | null>(null);
  const tpFillRef = useRef<LightweightCharts.ISeriesApi<"Baseline"> | null>(null);
  const slFillRef = useRef<LightweightCharts.ISeriesApi<"Baseline"> | null>(null);
  const forcedPriceRef = useRef<number | null>(null);
const lastCandleRef = useRef<{ time: number; open: number; high: number; low: number; close: number } | null>(null);
  const currentChartTimeRef = useRef<number>(Math.floor(Date.now() / 1000));
  const tradeOpenTimeRef = useRef<number | null>(null);
  const hadTradeLinesRef = useRef(false);

  const container = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const activeLinesRef = useRef<LightweightCharts.IPriceLine[]>([]);
  const [badgeY, setBadgeY] = useState<{ entry: number | null; tp: number | null; sl: number | null }>({ entry: null, tp: null, sl: null });
  const [interval, setInterval] = useState("15m");
  const [isChartReady, setIsChartReady] = useState(false);
  const [futureCandlesBox, setFutureCandlesBox] = useState(44);
  const [livePrice, setLivePrice] = useState<number | null>(null);

  const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d"];

  useEffect(() => {
    onIntervalChange?.(interval);
  }, [interval]);

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

    const intervalMap: Record<string, number> = {
  "1m": 60, "5m": 300, "15m": 900,
  "1h": 3600, "4h": 14400, "1d": 86400
};
const intervalSecs = intervalMap[interval] || 900;

// use the chart's own virtual clock, not the parent's real-time timestamp
const startTime = (tradeOpenTimeRef.current ?? currentChartTimeRef.current) as LightweightCharts.UTCTimestamp;
const endTime = (startTime + intervalSecs * futureCandlesBox) as LightweightCharts.UTCTimestamp;

tpFillRef.current.setData([{ time: startTime, value: tp }, { time: endTime, value: tp }]);
slFillRef.current.setData([{ time: startTime, value: sl }, { time: endTime, value: sl }]);

    const eLine = seriesRef.current.createPriceLine({ 
      price: entry, color: isBuy ? '#1e3a8a' : '#FF1744', 
      lineWidth: 2, lineStyle: LightweightCharts.LineStyle.Solid
    });
    const tLine = seriesRef.current.createPriceLine({ 
      price: tp, color: '#00E676', lineWidth: 2, lineStyle: LightweightCharts.LineStyle.Solid
    });
    const sLine = seriesRef.current.createPriceLine({ 
      price: sl, color: '#FF1744', lineWidth: 2, lineStyle: LightweightCharts.LineStyle.Solid
    });

    activeLinesRef.current = [eLine, tLine, sLine];
  };

   // Effect 1: create the chart once on mount
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

 

  // Effect 2: track badge Y-positions, independent of chart creation
  useEffect(() => {
    if (!tradeLines || !seriesRef.current) {
      setBadgeY({ entry: null, tp: null, sl: null });
      return;
    }

    let rafId: number;
    const update = () => {
      if (seriesRef.current) {
        setBadgeY({
          entry: seriesRef.current.priceToCoordinate(tradeLines.entry),
          tp: seriesRef.current.priceToCoordinate(tradeLines.tp),
          sl: seriesRef.current.priceToCoordinate(tradeLines.sl),
        });
      }
      rafId = requestAnimationFrame(update);
    };
    update();

    return () => cancelAnimationFrame(rafId);
  }, [tradeLines, isChartReady]);

  useEffect(() => {
  if (!isChartReady || !seriesRef.current) return;
  
  let isCurrent = true; // Flag to prevent race conditions
  const intervalMap: Record<string, number> = {
    "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400
  };
  const intervalSecs = intervalMap[interval] || 900;

  seriesRef.current.setData([]);

  const binanceSymbol = symbol.replace("/", "").toUpperCase();

  // 1. Immediate Cleanup of existing socket
  if (wsRef.current) {
    wsRef.current.onmessage = null;
    wsRef.current.close();
    wsRef.current = null;
  }

  const restBase = "https://fapi.binance.com/fapi/v1";
  const wsBase = "fstream.binance.com/market";

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
        if (forcedPriceRef.current != null) return; // DEMO: ignore real ticks while forcing the win
        
        const k = JSON.parse(event.data).k;
        lastCandleRef.current = {
  time: k.t / 1000,
  open: parseFloat(k.o), high: parseFloat(k.h),
  low: parseFloat(k.l), close: parseFloat(k.c),
};
        currentChartTimeRef.current = k.t / 1000; 
        if (onPriceUpdate) onPriceUpdate(parseFloat(k.c).toFixed(2));
        setLivePrice(parseFloat(k.c));
        
        if (seriesRef.current && isChartReady) {
          try {
           const candleTime = (k.t / 1000) as LightweightCharts.UTCTimestamp;
const currentData = seriesRef.current.data() as any[];
const realData = currentData.filter((c: any) => c.time < candleTime);
const intervalSecs3 = ({ "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400 } as Record<string, number>)[interval] || 900;

const liveCandle = {
  time: candleTime,
  open: parseFloat(k.o), high: parseFloat(k.h),
  low: parseFloat(k.l), close: parseFloat(k.c),
};
const futureCandles2 = Array.from({ length: futureCandlesBox }, (_, i) => ({
  time: (candleTime + intervalSecs3 * (i + 1)) as LightweightCharts.UTCTimestamp,
  open: parseFloat(k.c), high: parseFloat(k.c),
  low: parseFloat(k.c), close: parseFloat(k.c),
}));
seriesRef.current.setData([...realData, liveCandle, ...futureCandles2]);
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
}, [isChartReady, symbol, interval]);

// DEMO: draw the forced price on the chart
useEffect(() => {
  forcedPriceRef.current = forcedPrice ?? null;
  if (forcedPrice == null || !seriesRef.current || !lastCandleRef.current) return;

  const secs = ({ "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400 } as Record<string, number>)[interval] || 900;

  const c = lastCandleRef.current;
  const updated = { ...c, high: Math.max(c.high, forcedPrice), close: forcedPrice };
  lastCandleRef.current = updated;

  // keep only real candles older than the live one
  const all = seriesRef.current.data() as any[];
  const real = all.filter((x: any) => x.time < updated.time);

  const future = Array.from({ length: futureCandlesBox }, (_, i) => ({
    time: (updated.time + secs * (i + 1)) as LightweightCharts.UTCTimestamp,
    open: forcedPrice, high: forcedPrice, low: forcedPrice, close: forcedPrice,
  }));

  setLivePrice(forcedPrice);
  try {
    seriesRef.current.setData([
      ...real,
      { ...updated, time: updated.time as LightweightCharts.UTCTimestamp },
      ...future,
    ]);
  } catch {}
}, [forcedPrice]);

useEffect(() => {
  if (tradeLines && !hadTradeLinesRef.current) {
    tradeOpenTimeRef.current = currentChartTimeRef.current;
  }
  if (!tradeLines) {
    tradeOpenTimeRef.current = null;
  }
  hadTradeLinesRef.current = !!tradeLines;
}, [tradeLines]);

  useEffect(() => {
    if (isChartReady) updateVisuals(tradeLines);
  }, [tradeLines, isChartReady]);

  const calcPnl = (target: number) => {
  if (!tradeLines) return 0;
  const { entry, side, amount = 0, leverage = 1 } = tradeLines;
  const isBuy = side.toUpperCase() === "BUY";
  const move = isBuy ? (target - entry) / entry : (entry - target) / entry;
  return amount * leverage * move;
};

const calcQty = () => {
  if (!tradeLines || !tradeLines.entry) return "0";
  const { entry, amount = 0, leverage = 1 } = tradeLines;
  const qty = (amount * leverage) / entry;
  return qty.toFixed(4);
};

  return (
    <div className="flex-1 w-full bg-black relative overflow-hidden flex flex-col"> 
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3 gap-1 pointer-events-none bg-black p-2 rounded-xl">
        <h2 className="font-semibold text-white ">{symbol}</h2>
        
        <div className="pointer-events-auto">
        
        <Select value={interval} onValueChange={setInterval}>
  <SelectTrigger className="border-none bg-transparent p-2 focus:ring-0 focus:ring-offset-0 gap-1 text-[11px] font-semibold text-white/70  hover:text-white transition-colors cursor-pointer outline-none">
    <SelectValue />
  </SelectTrigger>
  <SelectContent side="top" sideOffset={3} align="start" position="popper" className="text-white border-0">
    {timeframes.map((tf) => (
      <SelectItem
        key={tf}
        value={tf}
        className="text-[11px] font-semibold focus:text-white cursor-pointer transition-colors"
      >
        {tf.toUpperCase()}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

      </div>
      </div>
      <div className="absolute inset-0 h-full w-full" ref={container} />
      {tradeLines && (
  <div className="absolute inset-0 pointer-events-none z-10">
    {badgeY.tp !== null && (
      <div className="absolute right-28 -translate-y-1/2 flex items-center gap-2 bg-black border border-[#00E676] text-[#00E676] text-xs font-semibold px-3 py-1 rounded-lg"
           style={{ top: badgeY.tp }}>
        <span>{calcQty()}</span>
        |
        <span>{calcPnl(tradeLines.tp) >= 0 ? "+" : ""}{calcPnl(tradeLines.tp).toFixed(2)} USD</span>
      </div>
    )}
    {badgeY.entry !== null && (
      <div className={cn(
        "absolute right-28 -translate-y-1/2 flex items-center gap-2 text-xs font-semibold rounded-lg pr-2 border bg-black",
        tradeLines.side.toUpperCase() === "BUY" ? " border-blue-500 text-blue-400" : " border-[#FF1744] text-[#FF1744]"
      )} style={{ top: badgeY.entry }}>
        <span className={`${tradeLines.side.toUpperCase() === "BUY" ? "bg-blue-500" : " bg-[#FF1744]"} p-1 px-2
        rounded-l-lg text-white`}>{calcQty()}</span>

        <span>
  {livePrice !== null
    ? `${calcPnl(livePrice) >= 0 ? "+" : ""}${calcPnl(livePrice).toFixed(2)} USD`
    : "0.00 USD"}
</span>

      </div>
    )}
    {badgeY.sl !== null && (
      <div className="absolute right-28 -translate-y-1/2 flex items-center gap-2 bg-black border border-[#FF1744] text-[#FF1744] text-xs font-semibold px-3 py-1 rounded-lg"
           style={{ top: badgeY.sl }}>
        <span>{calcQty()}</span>
        |
        <span>{calcPnl(tradeLines.sl).toFixed(2)} USD</span>
      </div>
    )}
  </div>
)}
    </div>
  );
});

/**
 * INTERACTIVE TRADE WIDGET COMPONENT (Exact UI preserved)
 */
const TradeWidget = memo(function TradeWidget({ onReset, onAccept, disabled, onPriceChange, price , initialData}: TradeWidgetProps) {
  const [side, setSide] = useState(initialData?.side || "buy"); 
  const [amount, setAmount] = useState("10000");
  const [symbol, setSymbol] = useState(initialData?.symbol || "BTC/USDT");
  const [leverage, setLeverage] = useState(initialData?.leverage?.toString() || "10");
  const [tp, setTp] = useState(initialData?.take_profit?.toString() || "");
  const [sl, setSl] = useState(initialData?.stop_loss?.toString() || "");
  const [showMobileTip, setShowMobileTip] = useState(false);

// null = not yet captured, so we track live price. Once set, it's frozen forever.
const [capturedEntry, setCapturedEntry] = useState<number | null>(null);

const livePrice = price || "0.00";
const displayPrice = capturedEntry !== null ? capturedEntry.toString() : livePrice;
const entry = capturedEntry !== null ? capturedEntry : parseFloat(livePrice);

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
    onPriceChange({ 
      entry, 
      tp: parseFloat(tp), 
      sl: parseFloat(sl), 
      side,
      amount: parseFloat(amount),
      leverage: parseFloat(leverage)
    });
  }
}, [entry, tp, sl, side, amount, leverage, onPriceChange]);
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
    <span >To Win</span>
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
          <div className="space-y-3">
  <label className="text-[10px] uppercase tracking-wider text-white/30 px-1">Leverage</label>

  {/* Value display with – and + */}
  <div className="flex items-center gap-2">
    <button
      disabled={disabled}
      onClick={() => setLeverage(v => String(Math.max(1, parseInt(v) - 1)))}
      className="w-8 h-8 rounded bg-white/10 text-white text-lg flex items-center justify-center hover:bg-white/20 disabled:opacity-30 cursor-pointer"
    >−</button>

    <div className="flex-1 text-center text-white font-bold text-xl tracking-tight">
      {leverage}<span className="text-white text-base font-normal">x</span>
    </div>

    <button
      disabled={disabled}
      onClick={() => setLeverage(v => String(Math.min(125, parseInt(v) + 1)))}
      className="w-8 h-8 rounded bg-white/10 text-white text-lg flex items-center justify-center hover:bg-white/20 disabled:opacity-30 cursor-pointer"
    >+</button>
  </div>

  {/* Slider track with dot markers */}
  <div className="relative px-1 py-2">
    {/* Track */}
    <div className="relative h-[3px] rounded-full bg-white/15 mx-1">
      <div
        className="absolute left-0 top-0 h-full rounded-full bg-white transition-all"
        style={{ width: `${((parseInt(leverage) - 1) / 124) * 100}%` }}
      />
      {/* Thumb dot */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-black shadow transition-all"
        style={{ left: `${((parseInt(leverage) - 1) / 124) * 100}%` }}
      />
      {/* Tick dots */}
      {[1, 25, 50, 75, 100, 125].map(v => (
        <div
          key={v}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full border border-white/30"
          style={{
            left: `${((v - 1) / 124) * 100}%`,
            background: '#ffffff' 
          }}
        />
      ))}
    </div>

    {/* Invisible range input */}
    <input
      disabled={disabled}
      type="range" min={1} max={125} step={1}
      value={leverage}
      onChange={(e) => setLeverage(e.target.value)}
      className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
    />
  </div>

  {/* Tick labels */}
  <div className="flex justify-between text-[9px] text-white/25 px-1">
    {[1, 25, 50, 75, 100, 125].map(v => (
      <span key={v}>{v}x</span>
    ))}
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
              setCapturedEntry(entry);
    onAccept({
      symbol,
      side,
      leverage,
      amount,
      tp,
      sl,
      entry
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

const DEMO_PROMPT = "/scalp-trade on Bitcoin";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function VibeTradingUIContent() {
  const searchParams = useSearchParams();
    const [forcedPrice, setForcedPrice] = useState<number | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTrading, setIsTrading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isExecuted, setIsExecuted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [activeLines, setActiveLines] = useState<TradeLines | null>(null);
  const [showAgent, setShowAgent] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<string | null>(null);
  const [activeSymbol, setActiveSymbol] = useState("BTC/USDT");
  const [activeTimeframe, setActiveTimeframe] = useState("15m");
  const [showPricing, setShowPricing] = useState(false);
  const [confirmedEntryPrice, setConfirmedEntryPrice] = useState<number | null>(null);
  const [lastResearch, setLastResearch] = useState<any>(null);
  const [activeTradeParams, setActiveTradeParams] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [isWidgetActive, setIsWidgetActive] = useState(false);
  const [isPositionClosed, setIsPositionClosed] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [tradeStatusText, setTradeStatusText] = useState<string | null>(null);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [activeTradeWidgetIndex, setActiveTradeWidgetIndex] = useState<number | null>(null);

  // DEMO: fake user, always verified, paper mode only
  const email = "demo@richacle.com";
  const isVerified = true;
  const [tradingMode, setTradingMode] = useState<"paper" | "binance">("paper");
  const [paperBalance, setPaperBalance] = useState(10000);

  // refs so delayed demo steps always read the latest values
  const currentPriceRef = useRef<string | null>(null);
  const activeLinesRef = useRef<TradeLines | null>(null);
  currentPriceRef.current = currentPrice;
  activeLinesRef.current = activeLines;

  const insertMode = (mode: string) => {
    setPrompt((prev) => (prev ? `${prev} /${mode} ` : `/${mode} `));
    setShowModeMenu(false);
    textareaRef.current?.focus();
  };

  const models = [
    { id: "auto", name: "Auto", tag: "Suggested" },
    { id: "claude-fable-5", name: "Claude Fable 5" },
    { id: "GPT-5.6-Sol", name: "GPT-5.6 Sol" },
    { id: "gemini-3.1", name: "Gemini 3.1 Pro" },
    { id: "grok-4.5", name: "Grok 4.5" },
    { id: "deepseek-v3.2", name: "Deepseek V3.2" },
  ];

  const handleResetPaperBalance = () => setPaperBalance(10000);

  const calcTerminalPnl = (priceOverride?: number) => {
    if (!activeLines) return { pnl: 0, roi: 0 };
    const { entry, side, amount = 0, leverage = 1 } = activeLines;
    const isBuy = side.toUpperCase() === "BUY";
    const price = priceOverride ?? parseFloat(currentPrice || "0");
    if (!price) return { pnl: 0, roi: 0 };
    const move = isBuy ? (price - entry) / entry : (entry - price) / entry;
    const roi = move * leverage;
    return { pnl: amount * roi, roi: roi * 100 };
  };

  useEffect(() => {
    setShowAgent(searchParams.get("agent") === "true");
  }, [searchParams]);

  // DEMO: typewriter effect that types the prompt automatically
  useEffect(() => {
    let i = 0;
    let timer: ReturnType<typeof setInterval>;
    const start = setTimeout(() => {
      timer = setInterval(() => {
        i++;
        setPrompt(DEMO_PROMPT.slice(0, i));
        if (i >= DEMO_PROMPT.length) clearInterval(timer);
      }, 90);
    }, 1200);
    return () => {
      clearTimeout(start);
      clearInterval(timer);
    };
  }, []);

  // TP / SL auto close
  const hasClosedRef = useRef(false);
  useEffect(() => {
    if (isExecuted) hasClosedRef.current = false;
  }, [isExecuted]);

  useEffect(() => {
    if (!isExecuted || !activeLines || !currentPrice) return;
    if (hasClosedRef.current) return;

    const price = parseFloat(currentPrice);
    const { tp, sl, side } = activeLines;
    const isBuy = side.toUpperCase() === "BUY";
    const tpHit = isBuy ? price >= tp : price <= tp;
    const slHit = isBuy ? price <= sl : price >= sl;

    if (tpHit || slHit) {
      hasClosedRef.current = true;
      handleCloseOrder(activeSymbol, tpHit ? tp : sl);
      tpHit ? toast(`TAKE PROFIT HIT ${tp}`) : toast.error(`STOP LOSS HIT ${sl}`);
    }
  }, [currentPrice, isExecuted, activeLines, activeSymbol]);

  // DEMO: fake order placement
  const handleAccept = async (tradeParams: TradeParams) => {
    setActiveTradeParams(tradeParams);
    setIsTrading(true);
    await sleep(1500); // "Trading" animation

    setConfirmedEntryPrice(tradeParams.entry);
    setIsExecuted(true);
    setIsPositionClosed(false);
    setMessages((prev) => [
      ...prev,
      {
        role: "ai",
        content: (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-2 flex flex-col gap-2">
            <div className="flex items-center">Order placed {tradeParams.symbol}</div>
          </motion.div>
        ),
      },
    ]);
    setIsTrading(false);
  };

  const handleReject = () => {
    setIsWidgetActive(false);
    setActiveLines(null);
    setIsRejected(true);
  };

  const handleReset = () => {
    setMessages([]);
    setIsSearching(false);
    setPrompt("");
    setIsExecuted(false);
    setActiveLines(null);
    setIsWidgetActive(false);
    setIsRejected(false);
    setConfirmedEntryPrice(null);
  };

  // DEMO: paper close only
  const handleCloseOrder = async (symbol: string, exitPriceOverride?: number) => {
    if (isClosing) return;
    setIsClosing(true);
    await sleep(800);

    const exitPrice = exitPriceOverride ?? parseFloat(currentPrice || "0");
    const { pnl } = calcTerminalPnl(exitPrice);
    setPaperBalance((prev) => Math.max(0, prev + pnl));

    setMessages((prev) => [
      ...prev,
      {
        role: "ai",
        content: (
          <div className="text-left p-4">
            Position for {symbol} closed. PnL: {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)} USD
          </div>
        ),
      },
    ]);

    setIsWidgetActive(false);
    setActiveLines(null);
    setIsExecuted(false);
    setConfirmedEntryPrice(null);
    hasClosedRef.current = false;
    setIsPositionClosed(false);
    setIsRejected(false);
    setIsClosing(false);
    setForcedPrice(null);
  };

  useEffect(() => {
    if (textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [prompt]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSearching]);

  // DEMO: fully scripted flow, no network calls
  const handleSend = async () => {
    if (!prompt.trim() || loading) return;
    const currentPrompt = prompt;
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: currentPrompt }]);
    setPrompt("");
    setIsSearching(true);

    // fake researching + predicting
    setTradeStatusText("Researching");
    await sleep(3500);
    setTradeStatusText("Predicting");
    await sleep(3500);
    setIsSearching(false);
    setTradeStatusText(null);

    // build predefined trade around the live BTC price
    const price = parseFloat(currentPriceRef.current || "") || 67000;
    const tradeData = {
      symbol: "BTC/USDT",
      side: "BUY",
      leverage: 10,
      entry_price: price,
      take_profit: +(price * 1.006).toFixed(2),
      stop_loss: +(price * 0.997).toFixed(2),
      confidence: 78,
    };

    // predefined research message
    setMessages((prev) => [
      ...prev,
      {
        role: "ai",
        content: (
          <div className="space-y-2 flex flex-col">
            <div className="p-3.5 text-zinc-200 text-[13px] leading-relaxed">
              Bitcoin is holding above its 15m EMA-50 with rising buy volume and a bullish RSI
              divergence. Funding is neutral and order-book depth shows strong bids just below price.
              Short-term momentum favors a quick push higher, so I'm setting up a scalp long with a
              tight stop under the latest swing low.
            </div>
          </div>
        ),
      },
    ]);
    await sleep(900);

    setLastResearch(tradeData);
    setIsRejected(false);
    setIsWidgetActive(true);
    setActiveSymbol(tradeData.symbol);
    setActiveLines({
      entry: tradeData.entry_price,
      tp: tradeData.take_profit,
      sl: tradeData.stop_loss,
      side: tradeData.side,
      amount: 10000,
      leverage: tradeData.leverage,
      startTime: Math.floor(Date.now() / 1000),
    });

    setMessages((prev) => {
      const next: Message[] = [
        ...prev,
        {
          role: "ai",
          content: (
            <div className="p-3.5 text-xl text-zinc-200 flex justify-between items-center w-full">
              <h1 className="font-semibold">Win Rate {tradeData.confidence}%</h1>
              <h1 className="font-light theseason">RICHACLE</h1>
            </div>
          ),
        },
        {
          role: "ai",
          content: (
            <TradeWidget
              initialData={tradeData}
              onPriceChange={setActiveLines}
              onReset={handleReject}
              onAccept={handleAccept}
              disabled={false}
              price={currentPrice}
            />
          ),
        },
      ];
      setActiveTradeWidgetIndex(next.length - 1);
      return next;
    });
    setLoading(false);

    // let the viewer see the widget, then auto place the trade
    await sleep(3500);
    const l = activeLinesRef.current;
    await handleAccept({
      symbol: tradeData.symbol,
      side: tradeData.side,
      leverage: String(tradeData.leverage),
      amount: "10000",
      tp: String(l?.tp ?? tradeData.take_profit),
      sl: String(l?.sl ?? tradeData.stop_loss),
      entry: l?.entry ?? tradeData.entry_price,
    });
    // DEMO: force the trade to win
await sleep(4000); // let the viewer see the open position first
const l2 = activeLinesRef.current;
if (!l2) return;

const start = parseFloat(currentPriceRef.current || "") || l2.entry;
const target = l2.tp;
const steps = 40;

for (let i = 1; i <= steps; i++) {
  const progress = i / steps;
  // small wobble that fades out so it looks like a real move and never overshoots early
  const wobble = Math.sin(i * 1.7) * Math.abs(target - start) * 0.05 * (1 - progress);
  const p = i === steps ? target : start + (target - start) * progress + wobble;

  setForcedPrice(p);
  setCurrentPrice(p.toFixed(2));
  await sleep(150);
}
  };

  // "+" button = new chat (local only)
  const handleClearMemory = () => {
    handleReset();
  };

  // ...keep your existing `return ( ... )` JSX below, unchanged


  return (
    <>
       <Navbar tradingMode={tradingMode} paperBalance={paperBalance} onModeChange={setTradingMode} onResetPaper={handleResetPaperBalance}  isVerified={isVerified}/>
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

      {/* LEFT SIDE: 70% */}
<div className="flex-[7] flex flex-col min-w-0 relative">
<AdvancedChart symbol={activeSymbol} tradeLines={activeLines} onPriceUpdate={setCurrentPrice} onIntervalChange={setActiveTimeframe} forcedPrice={forcedPrice} />

  {/* Terminal — Positions panel */}
  <div className="shrink-0 bg-black px-4 py-3 mb-7 md:mb-0">
    <div className="rounded-2xl bg-black  overflow-hidden">

      {/* Tabs */}
      <div className="flex items-center gap-6 px-5 pt-4 pb-3 ">
        <span className="text-[13px] font-semibold text-white">
          Positions ({isExecuted && activeLines ? 1 : 0})
        </span>
        <span className="text-[13px] font-medium text-white/25">
          Open Orders (0)
        </span>
        <span className="text-[13px] font-medium text-white/25">
          Fills
        </span>
      </div>

      {isExecuted && activeLines ? (
        (() => {
          const { pnl, roi } = calcTerminalPnl();
          const isProfit = pnl >= 0;
          const isBuy = activeLines.side.toUpperCase() === "BUY";
          const price = parseFloat(currentPrice || "0");
          const value = (activeLines.amount || 0) * (activeLines.leverage || 1);
          const qty = activeLines.entry ? (value / activeLines.entry) : 0;

          // Rough liquidation price estimate (isolated margin approximation)
          const lev = activeLines.leverage || 1;
          const liqPrice = isBuy
            ? activeLines.entry * (1 - 0.9 / lev)
            : activeLines.entry * (1 + 0.9 / lev);

          return (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse ">
                <thead>
                  <tr className="text-[11px] uppercase  text-white">
                    <th className="font-medium px-5 py-3">Symbol</th>
                    <th className="font-medium px-3 py-3">Size</th>
                    <th className="font-medium px-3 py-3">Value</th>
                    <th className="font-medium px-3 py-3">Ent. Price</th>
                    <th className="font-medium px-3 py-3">Liq. Price</th>
                    <th className="font-medium px-3 py-3">Oracle</th>
                    <th className="font-medium px-5 py-3 text-right">PNL</th>
                    <th className="font-medium px-3 py-3">Close position</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="relative text-[13px] ">
                    <td className="relative px-5 py-4">
                      <span className={cn(
                        "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r",
                        isProfit ? "bg-[#00E676]" : "bg-[#FF1744]"
                      )} />
                      <div className="flex flex-col">
                        <span className="text-white font-semibold">{activeSymbol}</span>
                        <span className={cn(
                          "text-[11px] font-semibold",
                          isBuy ? "text-blue-400" : "text-[#FF1744]"
                        )}>
                          {activeLines.leverage}x
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-col">
                        <span className={cn("font-semibold", isBuy ? "text-blue-400" : "text-[#FF1744]")}>
                          {qty.toFixed(2)}
                        </span>
                        <span className="text-white/30 text-[11px]">{activeSymbol.split("/")[0]}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-col">
                        <span className="text-white/80">{value.toFixed(2)}</span>
                        <span className="text-white/30 text-[11px]">USD</span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-col">
                        <span className="text-white/80">{activeLines.entry.toFixed(3)}</span>
                        <span className="text-white/30 text-[11px]">USD</span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-col">
                        <span className="text-blue-400/90">{liqPrice.toFixed(3)}</span>
                        <span className="text-white/30 text-[11px]">USD</span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <span className="text-white/80">{price ? price.toFixed(3) : "—"}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className={cn("font-semibold", isProfit ? "text-[#00E676]" : "text-[#FF1744]")}>
                          {isProfit ? "+" : ""}{roi.toFixed(2)}%
                        </span>
                        <span className={cn("text-[11px]", isProfit ? "text-[#00E676]/70" : "text-[#FF1744]/70")}>
                          {isProfit ? "+" : ""}{pnl.toFixed(2)} USDC
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                       
                <button
                  onClick={() => handleCloseOrder(activeSymbol)}
                  disabled={isClosing}
                  className="px-4 py-2 rounded-lg text-[11px] font-semibold uppercase text-white/60 hover:text-white transition-colors cursor-pointer disabled:opacity-30"
                >
                 X
                </button>
              
                    </td>
                  </tr>
                </tbody>
              </table>

             
            </div>
          );
        })()
      ) : (
        <div className="flex items-center justify-center h-24 text-white/25 text-[13px]">
          No open positions
        </div>
      )}
    </div>
  </div>
</div>



      

      {/* RIGHT SIDE: 30% (Exactly as you wanted it) */}
  <div className={cn(
  "flex-[3] flex flex-col bg-black min-w-[320px] max-w-[450px]  transition-all",
  // Mobile logic: Cover screen if shown, hide if not
  !showAgent ? "hidden md:flex" : "fixed inset-0 z-40 md:relative md:inset-auto"
)}>
<div className="bg-black flex justify-end items-center p-2 px-4 gap-2">

<h1 onClick={handleClearMemory} className="cursor-pointer p-2 text-right"><Plus size={20}/></h1>

<button onClick={() => setShowJournal(true)} className="cursor-pointer md:flex hidden text-white/40 hover:text-white/70 transition-colors">
        <Calendar size={23} />
      </button>
      <AnimatePresence>
        {showJournal && (
          <Journal email={email} onClose={() => setShowJournal(false)} />
        )}
      </AnimatePresence>
</div>



{messages.length === 0 && (
  <div className="w-full justify-center items-center flex h-full">
    <h1 
      className="text-3xl theseason pulse"
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
                    "max-w-[90%] p-3 text-[13px] leading-relaxed rounded-lg",
                    msg.role === "user" ? "bg-zinc-900 text-white" : "bg-transparent text-[#d1d1d1] pl-4"
                  )}>
{msg.content.split(/(\/scalp-trade|\/swing-trade|\/day-trade)/gi).map((part, i) =>
                      /^\/(scalp-trade|swing-trade|day-trade)$/i.test(part) ? (
                        <span key={i} className="bg-blue-950/60 text-blue-300 rounded px-1">{part}</span>
                      ) : (
                        <span key={i}>{part}</span>
                      )
                    )}
                  </div>
                ) : (
                  <div className="w-full">
                  
{React.isValidElement(msg.content) && msg.content.type === TradeWidget 
  ? React.cloneElement(msg.content as React.ReactElement<TradeWidgetProps>, { 
      disabled: i === activeTradeWidgetIndex 
        ? (isTrading || isExecuted || isRejected || !isWidgetActive) 
        : true,   
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
                
 {tradeStatusText && (
      <span className="text-white/40 pulse">{tradeStatusText}</span>
    )}
              </motion.div>
            )}

            {isTrading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 pl-1 pt-1">
              <span className="relative flex size-3">
  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
  <span className="relative inline-flex size-3 rounded-full bg-white"></span>
</span> 
                <span className=" text-white/40 pulse">Trading</span>
              </motion.div>
            )}
            {isClosing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 pl-1 pt-1">
              <span className="relative flex size-3">
  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
  <span className="relative inline-flex size-3 rounded-full bg-white"></span>
</span> 
                <span className=" text-white/40 pulse">Closing</span>
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
              <div className="relative mb-10 bg-[#0d0d0d] rounded-2xl  p-4 flex flex-col min-h-[140px] focus-within:border-white/20 transition-all">
              
                <div className="relative w-full">
  {/* Highlighted text layer — purely visual, sits behind the textarea */}
  <div
    aria-hidden="true"
    className="absolute inset-0 w-full text-[14px] px-0 py-0 whitespace-pre-wrap break-words pointer-events-none"
    style={{ fontFamily: "inherit", lineHeight: "inherit" }}
  >
    {prompt.split(/(\/scalp-trade|\/swing-trade|\/day-trade)/gi).map((part, i) =>
  /^\/(scalp-trade|swing-trade|day-trade)$/i.test(part) ? (
    <span key={i} className="bg-blue-950/60 text-blue-300 rounded">{part}</span>
  ) : (
    <span key={i} className="text-white">{part}</span>
  )
)}
    {/* trailing space so caret has room to sit after last char */}
    {prompt.length === 0 && <span className="text-white/50">Ask Richacle</span>}
  </div>

  {/* Actual textarea — text made transparent, only caret/selection visible */}
  <textarea
    ref={textareaRef}
    rows={2}
    maxLength={500}
    value={prompt}
    onChange={(e) => setPrompt(e.target.value)}
    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
    placeholder=""
    className="relative w-full bg-transparent border-none outline-none focus:ring-0 text-[14px] px-0 py-0 resize-none text-transparent caret-white"
  />
</div>
                <div className="flex justify-between items-center mt-auto">
                <div className="flex items-center gap-2">
                <div className="relative">
  <Plus
    size={40}
    onClick={() => setShowModeMenu(v => !v)}
    className="hover:bg-zinc-950 p-2 rounded-full cursor-pointer"
  />
  {showModeMenu && (
    <div className="absolute bottom-12 left-0 bg-[#141414] rounded-lg p-1 overflow-hidden z-50 min-w-[150px] shadow-xl">
      {["scalp-trade", "swing-trade", "day-trade"].map((mode) => (
        <button
          key={mode}
          onClick={() => insertMode(mode)}
          className="block w-full text-left px-3  rounded-lg py-2 text-xs hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          /{mode}
        </button>
      ))}
    </div>
  )}
</div>

               <Select 
  value={selectedModel} 
  onValueChange={(val) => {
    const model = models.find(m => m.id === val);
    if (model?.id !== "auto" && !isVerified) {
      toast("Upgrade your plan to unlock Top models.");
      setShowPricing(true);
      return; 
    }
    setSelectedModel(val);
  }}
>
  <SelectTrigger className="border-none bg-transparent p-2 focus:ring-0 focus:ring-offset-0 gap-1 text-[11px] font-semibold text-white/70 hover:text-white transition-colors cursor-pointer outline-none">
    <SelectValue />
  </SelectTrigger>

  <SelectContent side="top" sideOffset={3} align="start" position="popper" className="text-white border-0">
  {models.map((model) => {
    const locked = model.id !== "auto" && !isVerified;
    return (
      <SelectItem 
        key={model.id} 
        value={model.id}
        className={cn(
          "text-[11px] font-semibold focus:text-white transition-colors cursor-pointer",
          locked && "opacity-40 " 
        )}
      >
        <span className="flex items-center gap-2 justify-between">
          <span className="flex items-center gap-2">
            {model.name}
            {model.tag && (
              <span className="text-neutral-500 text-xs">
                Suggested
              </span>
            )}
          </span>
          {locked && <Lock size={11} className="text-zinc-500" />}
        </span>
      </SelectItem>
    );
  })}
</SelectContent>
</Select>
                 
</div>
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

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      `}} />
    </div>
    </>
  );
}

export default function VibeTradingUI() {
  return (
    <Suspense fallback={null}>
      <VibeTradingUIContent />
         <Menu/>
    </Suspense>
  );
}