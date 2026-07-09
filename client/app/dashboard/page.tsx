"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Calendar
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
  amount?: number;    // add this
  leverage?: number;  // add this
}

interface AdvancedChartProps {
  tradeLines: TradeLines | null;
  onPriceUpdate: (price: string) => void;
  symbol?: string;
  isDemo?: boolean;
  isFakeData?: boolean;       
  fakeStartPrice?: number;  
  demoTargetPrice?: number | null; 
  demoDurationSecs?: number;
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
  pnlPercentage: string;              // ADD
  details: {
    prompt: string;
    amount: string;
    leverage: string;
    odds: string;
    side: string;
    entryPrice: string;               // ADD
    markPrice: string;                // ADD
  };
  profile: {                          // ADD
    avatarUrl: string;
    username: string;
    name: string;
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

// Generates realistic-looking OHLC candles via a random walk
function generateFakeCandles(count: number, startPrice: number, intervalSecs: number) {
  const data = [];
  let price = startPrice;
  const now = Math.floor(Date.now() / 1000);
  const startTime = now - intervalSecs * count;

  for (let i = 0; i < count; i++) {
    const open = price;
    // Random walk with slight upward drift, tweak volatility to taste
    const volatility = open * 0.002; // 0.2% per candle
    const drift = (Math.random() - 0.48) * volatility * 2;
    const close = Math.max(open + drift, 0.01);

    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;

    data.push({
      time: (startTime + i * intervalSecs) as LightweightCharts.UTCTimestamp,
      open,
      high,
      low,
      close,
    });

    price = close;
  }
  return data;
}

// Generates a random walk from `start` to `target` over `steps` candles,
// guaranteed to land exactly on target, with natural up/down movement in between.
function generateBridgePath(start: number, target: number, steps: number, volatility = 2.8) {
  const path: number[] = [start];
  const totalMove = target - start;
  const avgStep = totalMove / steps;

  // Raw random walk (unconstrained)
  const rawWalk: number[] = [0];
  for (let i = 1; i <= steps; i++) {
    const noise = (Math.random() - 0.5) * Math.abs(avgStep) * volatility * 4;
    rawWalk.push(rawWalk[i - 1] + noise);
  }

  // Bridge correction: force rawWalk to end at 0, so we can add the linear trend after
  const endValue = rawWalk[steps];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const corrected = rawWalk[i] - t * endValue; // pulls the random walk back to 0 at the end
    path[i] = start + totalMove * t + corrected;
  }

  path[steps] = target; // force exact landing, no floating point drift
  return path;
}

const AdvancedChart = memo(function AdvancedChart({ tradeLines, onPriceUpdate, symbol = "BTC/USDT", isDemo = false,  isFakeData = false, fakeStartPrice = 62000 , demoTargetPrice = null, demoDurationSecs = 15}: AdvancedChartProps) {
  // 1. Properly typed refs using the imported library types
  const chartInstance = useRef<LightweightCharts.IChartApi | null>(null);
  const seriesRef = useRef<LightweightCharts.ISeriesApi<"Candlestick"> | null>(null);
  const tpFillRef = useRef<LightweightCharts.ISeriesApi<"Baseline"> | null>(null);
  const slFillRef = useRef<LightweightCharts.ISeriesApi<"Baseline"> | null>(null);

  const pathRef = useRef<number[] | null>(null);
const pathIndexRef = useRef(0);
const candleDurationMsRef = useRef(2000);

  const simPriceRef = useRef<number>(fakeStartPrice);
const demoTargetRef = useRef<number | null>(null);
const demoStartRef = useRef<{ price: number; time: number } | null>(null);
const demoDurationRef = useRef<number>(15);
  

  const container = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const activeLinesRef = useRef<LightweightCharts.IPriceLine[]>([]);
  const [badgeY, setBadgeY] = useState<{ entry: number | null; tp: number | null; sl: number | null }>({ entry: null, tp: null, sl: null });
  const [interval, setInterval] = useState("15m");
  const [isChartReady, setIsChartReady] = useState(false);
  const [futureCandlesBox, setFutureCandlesBox] = useState(44);
  const [livePrice, setLivePrice] = useState<number | null>(null);

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

useEffect(() => {
  demoDurationRef.current = demoDurationSecs;
  if (demoTargetPrice != null) {
    demoTargetRef.current = demoTargetPrice;
    demoStartRef.current = { price: simPriceRef.current, time: Date.now() };

    // Pre-plan the whole candle path right now — guarantees natural red/green mix
    const steps = 15; // matches desiredCandleCount below — keep these equal
    pathRef.current = generateBridgePath(simPriceRef.current, demoTargetPrice, steps, 2.8);
    pathIndexRef.current = 0;
    candleDurationMsRef.current = (demoDurationSecs * 1000) / steps;
  } else {
    demoTargetRef.current = null;
    demoStartRef.current = null;
    pathRef.current = null;
  }
}, [demoTargetPrice, demoDurationSecs]);

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

  // --- FAKE DATA PATH ---
  if (isFakeData) {
    const data = generateFakeCandles(300, fakeStartPrice, intervalSecs);
    const lastCandle = data[data.length - 1];

    const futureCandles = Array.from({ length: futureCandlesBox }, (_, i) => ({
      time: (lastCandle.time + intervalSecs * (i + 1)) as LightweightCharts.UTCTimestamp,
      open: lastCandle.close, high: lastCandle.close,
      low: lastCandle.close, close: lastCandle.close,
    }));

    seriesRef.current!.setData([...data, ...futureCandles]);
    chartInstance.current?.timeScale().fitContent();
    if (tradeLines) updateVisuals(tradeLines);
    onPriceUpdate(lastCandle.close.toFixed(2));
    setLivePrice(lastCandle.close);

    let simPrice = lastCandle.close;
simPriceRef.current = simPrice;
let simTime = lastCandle.time as number;
let candleOpen = simPrice;
let historicalData = data.slice(0, -1);
const desiredCandleCount = 60;

const fakeTimer = window.setInterval(() => {
  if (!isCurrent || !seriesRef.current) return;

  const path = pathRef.current;

  if (path != null) {
    // SCRIPTED MODE: interpolate smoothly between the current planned point and the next
    const idx = pathIndexRef.current;
    const from = path[idx];
    const to = path[Math.min(idx + 1, path.length - 1)];

    const elapsedInCandle = Date.now() - (demoStartRef.current!.time + idx * candleDurationMsRef.current);
    const progressInCandle = Math.min(elapsedInCandle / candleDurationMsRef.current, 1);

    const wickJitter = (Math.random() - 0.5) * Math.abs(to - from) * 0.15;
    simPrice = from + (to - from) * progressInCandle + wickJitter;
  } else {
    // NORMAL MODE: pure random walk (unchanged)
    const move = (Math.random() - 0.48) * simPrice * 0.0015;
    simPrice = Math.max(simPrice + move, 0.01);
  }

  simPriceRef.current = simPrice;

  const currentCandle = {
    time: simTime as LightweightCharts.UTCTimestamp,
    open: candleOpen,
    high: Math.max(candleOpen, simPrice),
    low: Math.min(candleOpen, simPrice),
    close: simPrice,
  };

  const futureCandlesNow = Array.from({ length: futureCandlesBox }, (_, i) => ({
    time: (simTime + intervalSecs * (i + 1)) as LightweightCharts.UTCTimestamp,
    open: simPrice, high: simPrice, low: simPrice, close: simPrice,
  }));

  seriesRef.current.setData([...historicalData, currentCandle, ...futureCandlesNow]);

  onPriceUpdate(simPrice.toFixed(2));
  setLivePrice(simPrice);
}, 300);

// Demo candles roll every ~2s regardless of the chart's actual timeframe,
// so a 15s scripted move produces ~7-8 visible candles instead of 1.

const idleRollMs = 10000; 
const demoRollMs = (demoDurationSecs * 1000) / desiredCandleCount;

let rollTimeoutId: ReturnType<typeof setTimeout>;

const scheduleRoll = () => {
  const path = pathRef.current;
  const delay = path != null ? candleDurationMsRef.current : idleRollMs;

  rollTimeoutId = setTimeout(() => {
    if (!isCurrent) return;

    historicalData = [...historicalData, {
      time: simTime as LightweightCharts.UTCTimestamp,
      open: candleOpen,
      high: Math.max(candleOpen, simPrice),
      low: Math.min(candleOpen, simPrice),
      close: simPrice,
    }];

    if (path != null && pathIndexRef.current < path.length - 1) {
      pathIndexRef.current += 1;
    }

    simTime += intervalSecs;
    candleOpen = simPrice;

    scheduleRoll();
  }, delay);
};

scheduleRoll();

return () => {
  isCurrent = false;
  window.clearInterval(fakeTimer);
  clearTimeout(rollTimeoutId);
};
  }
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
        setLivePrice(parseFloat(k.c));
        
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
}, [isChartReady, symbol, interval, isDemo, isFakeData, fakeStartPrice]);

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
  <SelectContent side="top" sideOffset={3} align="start" position="popper" className="text-white">
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
  const [amount, setAmount] = useState("100");
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

const TradeResultOverlay = ({ 
  type, 
  pnl,
  pnlPercentage,
  symbol, 
  onClose,
  details,
  profile
}: { 
  type: 'WIN' | 'LOSS', 
  pnl: string,
  pnlPercentage: string,
  symbol: string, 
  onClose: () => void,
  details: {
    prompt: string,
    amount: string,
    leverage: string,
    odds: string,
    side: string,
    entryPrice: string,
    markPrice: string,
  },
  profile: {
    avatarUrl: string,
    username: string,
    name: string,
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
          backgroundImage: "radial-gradient(100% 90% at 50% 100%, #7A001B 0%, #4A0010 30%, #1A0508 60%, #000000 90%, transparent 100%)"
        }}
      >
        <div className="relative z-10 p-5 flex flex-col items-center">
          
          {/* USER PROFILE ROW — NEW */}
          <div className="w-full flex items-center gap-3">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name || profile.username || "User"}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white  font-semibold">
                {(profile.name || profile.username || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col leading-tight">
              <span className="text-white text-sm font-semibold">{profile.name || "Anonymous"}</span>
              {profile.username && (
                <span className="text-zinc-400 text-xs">@{profile.username}</span>
              )}
            </div>

            
          </div>
          

          {/* Main Content Container: Mobile Stack, Desktop Row */}
          <div className="w-full flex flex-col md:flex-row items-stretch md:items-center overflow-hidden">
            
            {/* LEFT SIDE: Logo & Symbol/Side */}
            <div className="md:mr-10 p-4 md:p-8 text-left space-y-3">
              

              <h4 className="text-xl md:text-2xl font-bold tracking-tight uppercase text-white">
                {symbol}
              </h4>

              <div className="flex gap-3 items-center text-sm font-semibold text-white">
                <span>{details.side}</span>
                <span className="tabular-nums font-bold text-white">{details.leverage}x</span>
              </div>

              
              
            </div>

            

            {/* Separator */}
            <div className="h-px w-full md:h-40 md:w-px bg-white/10 my-2 md:my-0" />

            {/* RIGHT SIDE: Trade Details */}
            <div className="p-4 md:p-8 w-full md:w-64 text-left flex flex-col justify-center md:ml-5">
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs text-zinc-200 font-medium">
                    <span>Entry Price</span>
                    <span className="tabular-nums font-semibold text-white">${details.entryPrice}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-zinc-200 font-medium">
                    <span>Mark Price</span>
                    <span className="tabular-nums font-semibold text-white">${details.markPrice}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-zinc-200 font-medium">
                    <span>Odds</span>
                    <span className="tabular-nums font-semibold text-white">{details.odds}%</span>
                  </div>
                </div>

                <div className="h-px w-full bg-white/10 border-dashed border-zinc-600/20" />
                
                <div className="space-y-1">
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-4xl md:text-5xl font-bold tracking-tighter tabular-nums text-[#CFA968]">
                      {isWin ? '+' : '-'}${pnl}
                    </div>
                    <span className={cn(
                      "text-sm font-semibold tabular-nums bg-[#CFA968] p-1 px-3 rounded text-black",
                      
                    )}>
                      {isWin ? '+' : '-'}{pnlPercentage}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 mb-6 md:mb-10 w-full ">
                <img className="h-6 w-6 md:h-8 md:w-8 opacity-90" src="/logo.png" alt="logo"/>
                <p className="text-xl md:text-2xl text-white font-medium theseason">RICHACLE</p>
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
  const [showAgent, setShowAgent] = useState(false);
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
const [selectedModel, setSelectedModel] = useState("claude-fable-5");
const [loading, setLoading] = useState(false)
const [isWidgetActive, setIsWidgetActive] = useState(false);
const [isPositionClosed, setIsPositionClosed] = useState(false);
const [isRejected, setIsRejected] = useState(false);
const [showJournal, setShowJournal] = useState(false);
const [demoTargetPrice, setDemoTargetPrice] = useState<number | null>(null);
const [isFakeData, setIsFakeData] = useState(false);
const [userProfile, setUserProfile] = useState({
  avatarUrl: "",
  username: "",
  name: "",
});

const models = [
  { id: "claude-fable-5", name: "Claude Fable 5" },
  { id: "claude-4.8", name: "Claude Opus 4.8" },
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
    handleCloseOrder(activeSymbol); // still closes on either outcome

    // Only build/show the result overlay on a WIN
    if (tpHit) {
      const priceDiff = Math.abs(tp - entry);
      const percentageChange = priceDiff / entry;
      const leverageNum = parseFloat(activeTradeParams.leverage);
      const calculatedPnl = (
        parseFloat(activeTradeParams.amount) * leverageNum * percentageChange
      ).toFixed(2);
      const pnlPercentage = (percentageChange * leverageNum * 100).toFixed(2);

      setTradeResult({
        show: true,
        type: 'WIN',
        pnl: calculatedPnl,
        pnlPercentage,
        details: {
          prompt: lastResearch?.research_summary?.substring(0, 60) + "..." || "Trade Executed",
          amount: activeTradeParams.amount,
          leverage: activeTradeParams.leverage,
          odds: lastResearch?.confidence || "0",
          side: side,
          entryPrice: entry.toFixed(2),
          markPrice: tp.toFixed(2),
        },
        profile: userProfile,
      });
    }
    // slHit case: position closes, no overlay shown
  }
}, [currentPrice, isExecuted, activeLines, activeSymbol, activeTradeParams]);

      useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setEmail(session?.user?.email || "");
      setIsFakeData(session?.user?.email === "nileshinde001@gmail.com");
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
    if(!tpHit){
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

      setUserProfile({
      avatarUrl: userData?.avatar || "",
      username: userData?.username || "",
      name: userData?.name || "",
    });
      
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

  if (isFakeData) {
    await new Promise(res => setTimeout(res, 600));
    setConfirmedEntryPrice(tradeParams.entry);
    setIsExecuted(true);
    setIsPositionClosed(false);
    setDemoTargetPrice(parseFloat(tradeParams.tp));
    setMessages(prev => [
      ...prev,
      {
        role: "ai",
        content: (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-2 flex flex-col gap-2">
            <div className=" flex items-center">
              Order placed
            </div>
            {!isPositionClosed && (
          <button 
            className={cn(
              "mt-1 self-start px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer bg-white text-black"
            )}
          >
            Close position
          </button>
        )}
          </motion.div>
        )
      }
    ]);
    setIsTrading(false);
    return;
  }
  
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
    if (activeLines) {
  setDemoTargetPrice(activeLines.tp);
}
    setMessages(prev => [
      ...prev,
      {
        role: "ai",
        content: (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-2 flex flex-col gap-2">
            <div className=" flex items-center">
              Order placed
            </div>
            {!isPositionClosed && (
          <button 
            onClick={() => handleCloseOrder(tradeParams.symbol)} 
            disabled={isClosing}
            className={cn(
              "mt-1 self-start px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              isClosing 
                ? "opacity-40 cursor-not-allowed  bg-white text-black" 
                : "cursor-pointer bg-white text-black"
            )}
          >
            {isClosing ? "Closing" : "Close position"}
          </button>
        )}
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
  setDemoTargetPrice(null);
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
  setDemoTargetPrice(null);
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

  if (isFakeData) {
    await new Promise(res => setTimeout(res, 500)); // small fake delay for realism

    setIsPositionClosed(true);
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
    setIsClosing(false);
    return;
  }
  
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
      <div className="flex-[7] flex flex-col min-w-0 relative">
<div className="hidden md:absolute md:block bg-black p-3 text-white text-2xl theseason rounded-xl left-2 bottom-5 z-50 cursor-pointer">
  RICHACLE
</div>



{!showAgent && (
  <div className="absolute block md:hidden bg-black p-3 text-white text-xl theseason rounded-xl left-0 bottom-5 z-50 cursor-pointer">
    RICHACLE
  </div>
)}

        <AdvancedChart isDemo={isDemo}  isFakeData={isFakeData}
  fakeStartPrice={65000} demoTargetPrice={demoTargetPrice}
  demoDurationSecs={60}  symbol={activeSymbol} tradeLines={activeLines} onPriceUpdate={setCurrentPrice}/>
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
<button onClick={() => setShowJournal(true)} className="cursor-pointer p-2">
  <Calendar size={20} />
</button>
<AnimatePresence>
  {showJournal && (
    <Journal email={email}  onClose={() => setShowJournal(false)} />
  )}
</AnimatePresence>
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
      className="text-3xl theseason  "
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
                    msg.role === "user" ? "bg-zinc-900 text-white" : "bg-transparent text-[#d1d1d1] pl-4"
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
              <div className="relative bg-[#0d0d0d] rounded-2xl  p-4 flex flex-col min-h-[140px] focus-within:border-white/20 transition-all">
                <div className="relative w-full">
  {/* Highlighted text layer — purely visual, sits behind the textarea */}
  <div
    aria-hidden="true"
    className="absolute inset-0 w-full text-[14px] px-0 py-0 whitespace-pre-wrap break-words pointer-events-none"
    style={{ fontFamily: "inherit", lineHeight: "inherit" }}
  >
    {prompt.split(/(\/trade)/gi).map((part, i) =>
      part.toLowerCase() === "/trade" ? (
        <span key={i} className="text-blue-500">{part}</span>
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
                <div className="flex items-center gap-3">
                <Plus 
  size={40} 
  onClick={() => {
    setPrompt(prev => prev ? `${prev} /trade ` : "/trade ");
    textareaRef.current?.focus();
  }}
  className="hover:bg-zinc-900 p-2 rounded-full cursor-pointer"
/>

                <Select value={selectedModel} onValueChange={setSelectedModel}>
  <SelectTrigger className=" border-none bg-transparent p-2 focus:ring-0 focus:ring-offset-0 gap-1 text-[11px] font-semibold text-white/70  hover:text-white transition-colors cursor-pointer outline-none">
    <SelectValue />
  </SelectTrigger>
  
  <SelectContent side="top" sideOffset={3} align="start" position="popper"  className="text-white border-0 ">
    {models.map((model) => (
      <SelectItem 
        key={model.id} 
        value={model.id}
        className="text-[11px] font-semibold focus:text-white cursor-pointer transition-colors "
      >
        {model.name}
      </SelectItem>
    ))}
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
        <AnimatePresence>
      {tradeResult?.show && (
  <TradeResultOverlay 
    type={tradeResult.type}
    pnl={tradeResult.pnl}
    pnlPercentage={tradeResult.pnlPercentage}
    symbol={activeSymbol}
    details={tradeResult.details}
    profile={tradeResult.profile}
    onClose={() => {
      setTradeResult(null);
      handleReset();
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