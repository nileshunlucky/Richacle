"use client";

import React, { useState, useEffect, useRef, memo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Menu from "@/components/Menu"

import Journal from "@/components/Journal";
import { 
  ArrowUp, 
  Info, 
  Plus,
  LoaderCircle,
  X,
  Pencil
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

const cn = (...classes: (string | boolean | undefined | null)[]) => 
  classes.filter(Boolean).join(" ");

interface TradeLines {
  entry: number;
  tp: number;
  sl: number;
  side: string;
  amount?: number;
  leverage?: number;
  startTime?: number;
}

interface AdvancedChartProps {
  tradeLines: TradeLines | null;
  onPriceUpdate: (price: string) => void;
  symbol?: string;
  onIntervalChange?: (interval: string) => void;
  forcedPrice?: number | null; // DEMO
  onClose?: () => void;
  canClose?: boolean;
}

interface TradeWidgetProps {
  onReset: () => void;
  onAccept: (params: any) => void;
  disabled: boolean;
  onPriceChange: (lines: TradeLines) => void;
  price: string | null;
  initialData: {
    side?: string;
    symbol?: string;
    leverage?: number | string;
    amount?: number | string;  
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
  id?: string;
  role: "user" | "ai";
  content: string | React.ReactNode;
  agentStage?: number; // 0-5, only for the Aladdinberg progress message
}

const AdvancedChart = memo(function AdvancedChart({ tradeLines, onPriceUpdate, symbol = "BTC/USDT", onIntervalChange, forcedPrice, onClose, canClose }: AdvancedChartProps) {
  const chartInstance = useRef<LightweightCharts.IChartApi | null>(null);
  const seriesRef = useRef<LightweightCharts.ISeriesApi<"Candlestick"> | null>(null);
  const tpFillRef = useRef<LightweightCharts.ISeriesApi<"Baseline"> | null>(null);
  const slFillRef = useRef<LightweightCharts.ISeriesApi<"Baseline"> | null>(null);
  const forcedPriceRef = useRef<number | null>(null);
  const lastCandleRef = useRef<{ time: number; open: number; high: number; low: number; close: number } | null>(null);
  const currentChartTimeRef = useRef<number>(Math.floor(Date.now() / 1000));
  const tradeOpenTimeRef = useRef<number | null>(null);
  const hadTradeLinesRef = useRef(false);
  const fakeRef = useRef<{
    baseTime: number;
    ticks: number;
    candles: { time: number; open: number; high: number; low: number; close: number }[];
  } | null>(null);

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
    if (!seriesRef.current || !chartInstance.current) return;

    // CLEAR PREVIOUS LINES & FILLS
    activeLinesRef.current.forEach(line => seriesRef.current?.removePriceLine(line));
    activeLinesRef.current = [];
    if (tpFillRef.current) { chartInstance.current.removeSeries(tpFillRef.current); tpFillRef.current = null; }
    if (slFillRef.current) { chartInstance.current.removeSeries(slFillRef.current); slFillRef.current = null; }

    if (!lines) return;

    const { entry, tp, sl, side } = lines;
    const isBuy = side.toUpperCase() === 'BUY';

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
          const intervalSecs2 = ({ "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400 } as Record<string, number>)[interval] || 900;
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

  // DEMO: draw the forced price as several realistic candles
  useEffect(() => {
    forcedPriceRef.current = forcedPrice ?? null;

    // forcing ended -> reset so the next demo starts fresh
    if (forcedPrice == null) {
      fakeRef.current = null;
      return;
    }
    if (!seriesRef.current || !lastCandleRef.current) return;

    const secs =
      ({ "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400 } as Record<string, number>)[interval] || 900;
    const TICKS_PER_CANDLE = DEMO_TICKS_PER_CANDLE;

    // first forced tick: remember which live candle we start from
    if (!fakeRef.current) {
      fakeRef.current = { baseTime: lastCandleRef.current.time, ticks: 0, candles: [] };
    }
    const fake = fakeRef.current;

    const idx = Math.floor(fake.ticks / TICKS_PER_CANDLE);
    fake.ticks++;

    let candle = fake.candles[idx];
    if (!candle) {
      if (idx === 0) {
        // continue the real live candle
        candle = { ...lastCandleRef.current };
      } else {
        // new candle opens where the previous one closed
        const open = fake.candles[idx - 1].close;
        const pad = Math.abs(forcedPrice - open) * 0.4 + 0.01;
        candle = {
          time: fake.baseTime + secs * idx,
          open,
          high: Math.max(open, forcedPrice) + Math.random() * pad * 0.5,
          low: Math.min(open, forcedPrice) - Math.random() * pad * 0.5,
          close: forcedPrice,
        };
      }
      fake.candles[idx] = candle;
    }

    // update the candle currently forming
    candle.high = Math.max(candle.high, forcedPrice);
    candle.low = Math.min(candle.low, forcedPrice);
    candle.close = forcedPrice;

    // on the candle's last tick, add visible wicks beyond the body
    if ((fake.ticks - 1) % TICKS_PER_CANDLE === TICKS_PER_CANDLE - 1) {
      const body = Math.abs(candle.close - candle.open);
      const pad = body * 0.3 + forcedPrice * 0.0002;
      candle.high = Math.max(candle.open, candle.close) + Math.random() * pad;
      candle.low = Math.min(candle.open, candle.close) - Math.random() * pad;
    }

    // real history older than where we started
    const all = seriesRef.current.data() as any[];
    const real = all.filter((x: any) => x.time < fake.baseTime);

    // flat placeholder candles after the last fake one
    const lastTime = fake.baseTime + secs * idx;
    const future = Array.from({ length: futureCandlesBox }, (_, i) => ({
      time: (lastTime + secs * (i + 1)) as LightweightCharts.UTCTimestamp,
      open: forcedPrice, high: forcedPrice, low: forcedPrice, close: forcedPrice,
    }));

    setLivePrice(forcedPrice);
    try {
      seriesRef.current.setData([
        ...real,
        ...fake.candles.map((c) => ({ ...c, time: c.time as LightweightCharts.UTCTimestamp })),
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

              {canClose && (
                <button
                  onClick={onClose}
                  className="pointer-events-auto cursor-pointer px-1.5 text-white/60 hover:text-white"
                >
                  ✕
                </button>
              )}
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
  const [amount, setAmount] = useState(initialData?.amount?.toString() || "10000");
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

  const { toWin, roiPercentage } = React.useMemo(() => {
    const amt = parseFloat(amount) || 0;
    const lev = parseFloat(leverage) || 1;
    const targetPrice = parseFloat(tp) || 0;

    if (entry > 0 && targetPrice > 0 && amt > 0) {
      const isBuy = side.toUpperCase() === "BUY";
      const priceMove = isBuy 
        ? (targetPrice - entry) / entry 
        : (entry - targetPrice) / entry;

      const roi = priceMove * lev;
      const profit = amt * roi;
      const totalWin = amt + profit;

      return {
        toWin: totalWin.toFixed(2),
        roiPercentage: (roi * 100).toFixed(2)
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
        "bg-[#191b1b]/40 rounded-2xl p-4 space-y-4  transition-opacity",
        disabled && "opacity-10 pointer-events-none"
      )}
    >
      <div className="grid grid-cols-2 rounded-xl overflow-hidden font-bold ">
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
            <div className="flex items-center gap-2 p-2.5 px-3 rounded-lg bg-[#0d0d0d] ">
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
              <div className="relative h-[3px] rounded-full bg-white/15 mx-1">
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-white transition-all"
                  style={{ width: `${((parseInt(leverage) - 1) / 124) * 100}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-black shadow transition-all"
                  style={{ left: `${((parseInt(leverage) - 1) / 124) * 100}%` }}
                />
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

              <input
                disabled={disabled}
                type="range" min={1} max={125} step={1}
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>

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
              <div className="flex items-center gap-2 p-2.5 px-3 rounded-lg bg-zinc-900 ">
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
              <div className="flex items-center gap-2 p-2.5 px-3 rounded-lg bg-zinc-900 ">
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
        <div className="flex items-center gap-2">
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
                entry,
              });
            }}
            className="flex-1 h-10 flex items-center justify-center gap-1.5 px-4 rounded-xl
                       bg-white hover:bg-white/90 active:scale-[0.97]
                       text-neutral-900 font-semibold 
                       transition-all duration-150 cursor-pointer"
          >
            Trade
          </button>

          <button
            onClick={onReset}
            aria-label="Cancel"
            className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full
                       bg-neutral-800 hover:bg-neutral-700 active:scale-90
                       text-white transition-all duration-150 cursor-pointer"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </motion.div>
  );
});

/* ───────────────────────── ALADDINBERG AGENT UI ───────────────────────── */

const SCAN_COINS = ["btc","eth","bnb","sol","xrp","doge","ada","avax","link","dot","ltc","trx"];
const coinLogo = (s: string) => `https://assets.coincap.io/assets/icons/${s}@2x.png`;

const SOURCES = [
  { name: "X",           src: "https://cdn.simpleicons.org/x/ffffff" },
  { name: "Reddit",      src: "https://cdn.simpleicons.org/reddit/FF4500" },
  { name: "Google",      src: "https://cdn.simpleicons.org/google/ffffff" },
  { name: "Binance",     src: "https://cdn.simpleicons.org/binance/F0B90B" },
  { name: "TradingView", src: "https://cdn.simpleicons.org/tradingview/ffffff" },
  { name: "CoinDesk",    src: "https://cdn.simpleicons.org/coindesk/ffffff" },
  { name: "YouTube",     src: "https://cdn.simpleicons.org/youtube/FF0000" },
  { name: "Telegram",    src: "https://cdn.simpleicons.org/telegram/26A5E4" },
];

const Logo = ({ src, label, size = 28 }: { src: string; label: string; size?: number }) => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-semibold text-white/70 uppercase"
      >
        {label.slice(0, 3)}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={label}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="rounded-full object-contain"
    />
  );
};

const StepRow = ({ label, state }: { label: React.ReactNode; state: "active" | "done" }) => (
  <div className="flex items-center gap-3">
    <span className={state === "active" ? "text-white/60 pulse" : "text-white/80"}>{label}</span>
  </div>
);

const Reveal = ({ children }: { children: React.ReactNode }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
    {children}
  </motion.div>
);

const AgentProgress = memo(function AgentProgress({ stage }: { stage: number }) {
  const [sources, setSources] = useState<typeof SOURCES>([]);
  const [shown, setShown] = useState<string[]>([]);

  // stage 0: rolling coin logos
  useEffect(() => {
    if (stage !== 0) return;

    const pick = (cur: string[]) => {
      const pool = SCAN_COINS.filter(c => !cur.includes(c));
      return pool[Math.floor(Math.random() * pool.length)];
    };

    setShown([pick([])]);
    const t = setInterval(() => {
      setShown(cur => [...cur, pick(cur)].slice(-5));
    }, 600);

    return () => clearInterval(t);
  }, [stage]);

  // stage 2: rolling source logos
  useEffect(() => {
    if (stage !== 2) return;

    const pick = (cur: typeof SOURCES) => {
      const pool = SOURCES.filter(s => !cur.some(c => c.name === s.name));
      return pool[Math.floor(Math.random() * pool.length)];
    };

    setSources([pick([])]);
    const t = setInterval(() => {
      setSources(cur => [...cur, pick(cur)].slice(-5));
    }, 600);

    return () => clearInterval(t);
  }, [stage]);

  const st = (activeAt: number): "active" | "done" => (stage > activeAt ? "done" : "active");

  return (
    <div className="p-3.5 space-y-5 ">
      {/* 1. Scan */}
      <Reveal>
        <StepRow
          label={
            <span className="inline-flex items-center gap-2">
              {stage === 0 ? "Scanning Market" : "Scanned Market"}

              {stage === 0 && (
                <span className="inline-flex items-center pl-1">
                  <AnimatePresence initial={false} mode="popLayout">
                    {shown.map((c, i) => (
                      <motion.span
                        key={c}
                        layout
                        initial={{ opacity: 0, x: 24, scale: 0.4, rotate: -35 }}
                        animate={{ opacity: 1, x: 0, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, x: -24, scale: 0.4 }}
                        transition={{ type: "spring", stiffness: 300, damping: 22 }}
                        className="relative -ml-2 first:ml-0"
                        style={{ zIndex: i + 1 }}
                      >
                        <span className="block rounded-full">
                          <Logo src={coinLogo(c)} label={c} size={23} />
                        </span>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </span>
              )}
            </span>
          }
          state={st(0)}
        />

        {stage >= 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 rounded-xl bg-zinc-900 px-3 py-2 w-fit"
          >
            <Logo src={coinLogo("btc")} label="btc" size={28} />
            <div className="leading-tight">
              <div className="text-white font-semibold">Bitcoin</div>
              <div className="text-white/40 text-[11px]">BTC/USDT</div>
            </div>
          </motion.div>
        )}
      </Reveal>

      {/* 2. Research */}
      {stage >= 2 && (
        <Reveal>
          <StepRow
            label={
              <span className="inline-flex items-center gap-2">
                {stage === 2 ? "Researching" : "Researched"}

                {stage === 2 && (
                  <span className="inline-flex items-center pl-1">
                    <AnimatePresence initial={false} mode="popLayout">
                      {sources.map((s, i) => (
                        <motion.span
                          key={s.name}
                          layout
                          initial={{ opacity: 0, x: 24, scale: 0.4, rotate: -35 }}
                          animate={{ opacity: 1, x: 0, scale: 1, rotate: 0 }}
                          exit={{ opacity: 0, x: -24, scale: 0.4 }}
                          transition={{ type: "spring", stiffness: 300, damping: 22 }}
                          className="relative -ml-2 first:ml-0"
                          style={{ zIndex: i + 1 }}
                        >
                          <span className="block rounded-full bg-black p-1">
                            <Logo src={s.src} label={s.name} size={17} />
                          </span>
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </span>
                )}
              </span>
            }
            state={st(2)}
          />

          {stage >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2"
            >
              <span className="inline-flex items-center">
                {SOURCES.slice(0, 5).map((s, i) => (
                  <span
                    key={s.name}
                    className="relative -ml-2 first:ml-0 block rounded-full bg-zinc-900 p-1 ring-2 ring-black"
                    style={{ zIndex: i + 1 }}
                  >
                    <Logo src={s.src} label={s.name} size={17} />
                  </span>
                ))}
              </span>
              <span className="text-[11px] text-white/40">{SOURCES.length} sources scanned</span>
            </motion.div>
          )}
        </Reveal>
      )}

      {/* 3. Predict */}
      {stage >= 3 && (
        <Reveal>
          <StepRow label={stage === 3 ? "Predicting & Analysing" : "Analysed"} state={st(3)} />
        </Reveal>
      )}

      {/* 4. Risk */}
      {stage >= 4 && (
        <Reveal>
          <StepRow label={stage === 4 ? "Risk Managing" : "Risk Managed"} state={st(4)} />
        </Reveal>
      )}
    </div>
  );
});

const AGENT_RE = /\bal+ad+in+berg\b/i;

const SolidLock = ({ size = 14, className = "text-white" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className={className}
  >
    <path
      d="M7.9 10.5V8a4.1 4.1 0 0 1 8.2 0v2.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="butt"
    />
    <rect x="5.6" y="10" width="12.8" height="10.8" rx="2.4" fill="currentColor" />
  </svg>
);

/* ───────────────────────── DEMO CONFIG ───────────────────────── */

const DEMO_PROMPT = "Aladdinberg Agent";
const DEMO_TICKS_PER_CANDLE = 10;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const DEFAULT_CONFIG = {
  research:
    "Bitcoin is holding above its 15m EMA-50 with rising buy volume and a bullish RSI divergence. Funding is neutral and order-book depth shows strong bids just below price. Short-term momentum favors a quick push higher, so I'm setting up a scalp long with a tight stop under the latest swing low.",
  tpPct: "0.6",
  slPct: "0.3",
  Confidence: "78",
  amount: "10000",
  leverage: "10",
};
type DemoConfig = typeof DEFAULT_CONFIG;

const validateConfig = (c: DemoConfig) => {
  const errors: Partial<Record<keyof DemoConfig, string>> = {};
  const num = (v: string) => (v.trim() === "" ? NaN : Number(v));

  if (!c.research.trim()) errors.research = "Message can't be empty";
  if (!(num(c.tpPct) > 0)) errors.tpPct = "Must be greater than 0";
  if (!(num(c.slPct) > 0)) errors.slPct = "Must be greater than 0";
  const Confidence = num(c.Confidence);
  if (!(Confidence >= 0 && Confidence <= 100)) errors.Confidence = "0 – 100";
  if (!(num(c.amount) > 0)) errors.amount = "Must be greater than 0";
  const lev = num(c.leverage);
  if (!(Number.isInteger(lev) && lev >= 1 && lev <= 125)) errors.leverage = "Whole number 1 – 125";

  return errors;
};

function VibeTradingUIContent() {
  const [showBinance, setShowBinance] = useState(false);
  const [bnKey, setBnKey] = useState("");
  const [bnSecret, setBnSecret] = useState("");
  const [balanceInput, setBalanceInput] = useState("17534.08");
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
  const [isPhone, setIsPhone] = useState(false);

  const [config, setConfig] = useState<DemoConfig>(DEFAULT_CONFIG);
  const [draft, setDraft] = useState<DemoConfig>(DEFAULT_CONFIG);
  const [showEdit, setShowEdit] = useState(false);
  const configRef = useRef(config);
  const demoCancelRef = useRef(false);
  configRef.current = config;

  const draftErrors = validateConfig(draft);
  const canSave = Object.keys(draftErrors).length === 0;
  const editLocked = loading || isSearching || isTrading || isClosing || isWidgetActive || isExecuted;

  const openEdit = () => {
    if (editLocked) return;
    setDraft(config);
    setShowEdit(true);
  };
  const handleSaveEdit = () => {
    if (!canSave) return;
    setConfig(draft);
    setShowEdit(false);
    toast("Settings saved");
  };

  // Phone: force a 1280px-wide viewport so the laptop layout is shown at 16:9
  useEffect(() => {
    const phone = Math.min(window.screen.width, window.screen.height) < 768;
    setIsPhone(phone);
    if (!phone) return;

    document.body.style.background = "#000";
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "viewport");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "width=1280");
  }, []);

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
    setPrompt(mode);
    setShowModeMenu(false);
    textareaRef.current?.focus();
  };

  const models = [
    { id: "auto", name: "Auto", tag: "Suggested" },
    { id: "claude-fable-5.2", name: "Claude Fable 5.2" },
    { id: "claude-opus-5.5", name: "Claude Opus 5.5" },
    { id: "claude-sonnet-5.5", name: "Claude Sonnet 5.5" },
    { id: "gpt-6.2-astra", name: "GPT-6.2 Astra" },
    { id: "gemini-4-carbon", name: "Gemini 4 Carbon" },
    { id: "grok-4.6", name: "Grok 4.6" },
    { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro" },
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

  const runForcedWin = async () => {
    await sleep(2000); // pause after order placed, before price starts moving
    if (demoCancelRef.current) return;
    const l2 = activeLinesRef.current;
    if (!l2) return;

    const start = parseFloat(currentPriceRef.current || "") || l2.entry;
    const target = l2.tp;
    const T = DEMO_TICKS_PER_CANDLE;

    const N_CANDLES = 9;
    const redCount = 2 + Math.floor(Math.random() * 4);
    const RED_RATIO = 0.6;

    const pool = Array.from({ length: N_CANDLES - 2 }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const redSet = new Set(pool.slice(0, redCount));
    const greenCount = N_CANDLES - redCount;

    const g = (target - start) / (greenCount - RED_RATIO * redCount);
    const floorPrice = l2.sl + (start - l2.sl) * 0.5;
    const ceilPrice = target - g * 0.2;

    const levels: number[] = [start];
    for (let k = 0; k < N_CANDLES; k++) {
      if (k === N_CANDLES - 1) { levels.push(target); break; }
      const step = redSet.has(k) ? -g * RED_RATIO : g;
      levels.push(Math.min(ceilPrice, Math.max(floorPrice, levels[k] + step)));
    }

    for (let k = 0; k < N_CANDLES; k++) {
      const from = levels[k];
      const to = levels[k + 1];
      for (let t = 1; t <= T; t++) {
        if (demoCancelRef.current) return;
        const isLast = t === T;
        const noise = isLast ? 0 : (Math.random() - 0.5) * Math.abs(to - from) * 0.15;
        const p = isLast ? to : from + ((to - from) * t) / T + noise;

        setForcedPrice(p);
        setCurrentPrice(p.toFixed(2));
        await sleep(150);
      }
    }
  };

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

    runForcedWin();
  };

  const handleReject = () => {
    setIsWidgetActive(false);
    setActiveLines(null);
    setIsRejected(true);
  };

  const handleReset = () => {
    setForcedPrice(null);
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
    demoCancelRef.current = true;
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
    demoCancelRef.current = false;
    setForcedPrice(null);

    const currentPrompt = prompt;
    const isAgent = AGENT_RE.test(currentPrompt);
    const agentId = isAgent ? `agent-${Date.now()}` : null;

    const setStage = (stage: number) =>
      setMessages((prev) => prev.map((m) => (m.id === agentId ? { ...m, agentStage: stage } : m)));

    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: currentPrompt }]);
    setPrompt("");

    if (isAgent) {
      // Aladdinberg: scanning -> bitcoin -> researching -> predicting -> risk managing
      setMessages((prev) => [...prev, { id: agentId!, role: "ai", content: "", agentStage: 0 }]);
      const waits = [2500, 1200, 3500, 4500, 4000];
      for (let s = 0; s < waits.length; s++) {
        await sleep(waits[s]);
        if (s < 4) setStage(s + 1);
      }
      setStage(5); // all steps complete
    } else {
      // plain chat: fake researching + predicting
      setIsSearching(true);
      setTradeStatusText("Researching");
      await sleep(3500);
      setTradeStatusText("Predicting");
      await sleep(3500);
      setIsSearching(false);
      setTradeStatusText(null);
    }

    const cfg = configRef.current;
    const price = parseFloat(currentPriceRef.current || "") || 67000;
    const tradeData = {
      symbol: "BTC/USDT",
      side: "BUY",
      leverage: Number(cfg.leverage),
      amount: Number(cfg.amount),
      entry_price: price,
      take_profit: +(price * (1 + Number(cfg.tpPct) / 100)).toFixed(2),
      stop_loss: +(price * (1 - Number(cfg.slPct) / 100)).toFixed(2),
      confidence: Number(cfg.Confidence),
    };

    // predefined research message
    setMessages((prev) => [
      ...prev,
      {
        role: "ai",
        content: (
          <div className="space-y-2 flex flex-col">
            <div className="p-3.5 text-zinc-200 text-[13px] leading-relaxed whitespace-pre-line">
              {cfg.research}
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
      amount: tradeData.amount,
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
              <h1 className="">Confidence {tradeData.confidence}%</h1>
              <h1 className=" theseason">RICHACLE</h1>
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
  };

  // "+" button = new chat (local only)
  const handleClearMemory = () => {
    handleReset();
  };

  return (
    <div
      className={isPhone ? "fixed inset-0 bg-black flex items-center justify-center overflow-hidden" : ""}
    >
      <div
        className="flex flex-col"
        style={isPhone ? { width: "100vw", height: "56.25vw" } : { height: "100vh" }}
      >
        <nav className="h-14 shrink-0 bg-black flex items-center justify-between px-4 md:px-6 border-b border-white/5 relative z-50">
          <h1 className="text-xl text-white font-semibold theseason">RICHACLE</h1>

          <div className="flex items-center gap-3">
            <div className="flex items-center text-sm font-semibold text-white tabular-nums">
              <span>$</span>
              <input
                type="text"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value.replace(/[^0-9.]/g, ""))}
                onBlur={() => {
                  const n = parseFloat(balanceInput);
                  setBalanceInput(isNaN(n) ? "0.00" : n.toFixed(2));
                }}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                style={{ width: `${Math.max(balanceInput.length, 4) + 1}ch` }}
                className="bg-transparent border-none outline-none focus:ring-0 p-0 text-white"
              />
            </div>

            <div className="relative">
              {/* Binance text button (logo removed) */}
              <button
                onClick={() => setShowBinance((v) => !v)}
                className="flex items-center justify-center h-9 px-4 rounded-full transition-colors cursor-pointer text-sm font-semibold text-white"
              >
                Binance
              </button>

              <AnimatePresence>
                {showBinance && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 w-[300px] bg-[#0d0d0d] rounded-2xl p-4 space-y-3 shadow-2xl select-text"
                  >
                    <p className="text-sm font-semibold text-white">Binance Futures</p>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-white/30 px-1">API key</label>
                      <input
                        value={bnKey}
                        onChange={(e) => setBnKey(e.target.value)}
                        placeholder="Paste your API key"
                        className="w-full bg-[#191b1b] rounded-lg p-2.5 text-xs text-white outline-none placeholder:text-white/20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-white/30 px-1">API secret</label>
                      <input
                        type="password"
                        value={bnSecret}
                        onChange={(e) => setBnSecret(e.target.value)}
                        placeholder="Paste your API secret"
                        className="w-full bg-[#191b1b]  rounded-lg p-2.5 text-xs text-white outline-none placeholder:text-white/20"
                      />
                    </div>

                    <button
                      disabled={!bnKey.trim() || !bnSecret.trim()}
                      onClick={() => {
                        toast("Binance Futures connected");
                        setBnKey("");
                        setBnSecret("");
                        setShowBinance(false);
                      }}
                      className="w-full p-2.5 rounded-lg bg-white text-black text-xs font-semibold hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Connect
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </nav>

        <div className="flex flex-1 min-h-0 bg-[#0a0a0a] text-[#d1d1d1] overflow-hidden font-sans select-none">
          {showPricing && (
            <div className="fixed inset-0 w-full h-full z-[9999] bg-black/90 backdrop-blur-md overflow-y-auto">
              <button 
                onClick={() => setShowPricing(false)}
                className="fixed top-5 right-10 z-[10000] text-white cursor-pointer"
              >
                ✕
              </button>
              <Pricing />
            </div>
          )}

          {showEdit && (
            <div
              className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-text"
              onClick={() => setShowEdit(false)}
            >
              <div
                className="w-full max-w-md bg-[#0d0d0d]  rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-white font-semibold">Edit trade settings</h2>
                  <button onClick={() => setShowEdit(false)} className="text-white/40 hover:text-white cursor-pointer">
                    <X size={18} />
                  </button>
                </div>

                {/* Research message */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-white/30 px-1">Research message</label>
                  <textarea
                    rows={5}
                    value={draft.research}
                    onChange={(e) => setDraft({ ...draft, research: e.target.value })}
                    className="w-full bg-[#191b1b]  rounded-lg p-2.5 text-xs text-white outline-none resize-none"
                  />
                  {draftErrors.research && <p className="text-[10px] text-red-500 px-1">{draftErrors.research}</p>}
                </div>

                {/* Numeric fields */}
                <div className="grid grid-cols-2 gap-3">
                  {([
                    ["Confidence", "Confidence (%)"],
                    ["leverage", "Leverage (x)"],
                    ["amount", "Amount ($)"],
                    ["tpPct", "Take profit (% above entry)"],
                    ["slPct", "Stop loss (% below entry)"],
                  ] as [keyof DemoConfig, string][]).map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-white/30 px-1">{label}</label>
                      <input
                        type="number"
                        value={draft[key]}
                        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                        className={cn(
                          "w-full bg-[#191b1b]  rounded-lg p-2.5 text-xs text-white outline-none",
                          draftErrors[key] ? "border-red-500/60" : "border-white/10"
                        )}
                      />
                      {draftErrors[key] && <p className="text-[10px] text-red-500 px-1">{draftErrors[key]}</p>}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setDraft(DEFAULT_CONFIG)}
                    className="px-3 py-2 text-xs rounded-lg text-white/50 hover:text-white cursor-pointer"
                  >
                    Reset defaults
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => setShowEdit(false)}
                    className="px-4 py-2 text-xs rounded-lg bg-white/5 text-white/70 hover:bg-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={!canSave}
                    className="px-4 py-2 text-xs rounded-lg bg-green-700/30 text-green-200 hover:bg-green-700/40 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* LEFT SIDE: 70% */}
          <div className="flex-[7] flex flex-col min-w-0 relative">
            <AdvancedChart
              symbol={activeSymbol}
              tradeLines={activeLines}
              onPriceUpdate={setCurrentPrice}
              onIntervalChange={setActiveTimeframe}
              forcedPrice={forcedPrice}
              onClose={() => handleCloseOrder(activeSymbol)}
              canClose={isExecuted && !isClosing}
            />
          </div>

          {/* RIGHT SIDE: 30% */}
          <div className={cn(
            "flex-[3] flex flex-col bg-black min-w-[320px] max-w-[450px]  transition-all",
            !showAgent ? "hidden md:flex" : "fixed inset-0 z-40 md:relative md:inset-auto"
          )}>
            <div className="bg-black flex justify-end items-center p-2 px-4 gap-2">
              <button
                onClick={openEdit}
                disabled={editLocked}
                title={editLocked ? "Finish or close the current trade first" : "Edit trade settings"}
                className="cursor-pointer fixed bottom-12 right-12 text-white/40 hover:text-white/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-50"
              >
                <Pencil size={18} />
              </button>

              <h1 onClick={handleClearMemory} className="cursor-pointer p-2 text-right"><Plus size={20}/></h1>

              <AnimatePresence>
                {showJournal && (
                  <Journal email={email} onClose={() => setShowJournal(false)} />
                )}
              </AnimatePresence>
            </div>

            {messages.length === 0 && (
              <div className="w-full justify-center items-center flex h-full">
                <h1 className="text-3xl theseason pulse">
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
                    {msg.agentStage !== undefined ? (
                      <div className="w-full">
                        <AgentProgress stage={msg.agentStage} />
                      </div>
                    ) : typeof msg.content === 'string' ? (
                      <div className={cn(
                        "max-w-[90%] p-3 text-[13px] leading-relaxed rounded-lg",
                        msg.role === "user" ? "bg-zinc-900 text-white" : "bg-transparent text-[#d1d1d1] pl-4"
                      )}>
                        {msg.content.split(/(Aladdinberg Agent)/gi).map((part, j) =>
                          /^Aladdinberg Agent$/i.test(part) ? (
                            <span key={j} className="bg-white text-black rounded px-3 py-1 font-semibold">{part}</span>
                          ) : (
                            <span key={j}>{part}</span>
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
              {(
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
                        {prompt.split(/(Aladdinberg Agent)/gi).map((part, i) =>
                          /^Aladdinberg Agent$/i.test(part) ? (
                            <span key={i} className="bg-white text-black font-semibold rounded py-1 px-3">{part}</span>
                          ) : (
                            <span key={i} className="text-white">{part}</span>
                          )
                        )}
                        {prompt.length === 0 && <span className="text-white/50">Ask Richacle</span>}
                      </div>

                      {/* Actual textarea — text transparent, only caret/selection visible */}
                      <textarea
                        ref={textareaRef}
                        readOnly={AGENT_RE.test(prompt)}
                        rows={2}
                        maxLength={500}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          } else if (e.key === "Backspace" && AGENT_RE.test(prompt)) {
                            setPrompt("");
                          }
                        }}
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
                              {["Aladdinberg Agent"].map((mode) => (
                                <button
                                  key={mode}
                                  onClick={() => insertMode(mode)}
                                  className="block w-full text-left px-3  rounded-lg py-2 text-xs hover:bg-zinc-800 transition-colors cursor-pointer"
                                >
                                  {mode}
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
                                    {locked && <SolidLock size={14} />}
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
      </div>
    </div>
  );
}

export default function VibeTradingUI() {
  return (
    <Suspense fallback={null}>
      <VibeTradingUIContent />
      <Menu />
    </Suspense>
  );
}