"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Info, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import * as LightweightCharts from "lightweight-charts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MarketData {
    leverage: string;
    odds: string;
    side: string;
  symbol: string;
  side: string;
  leverage: string;
  tp: string;
  sl: string;
  summary: string;
  timeline: string;
}

interface TradeLines {
  entry: number;
  tp: number;
  sl: number;
  side: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(" ");

// ─── AdvancedChart ────────────────────────────────────────────────────────────

interface AdvancedChartProps {
  tradeLines: TradeLines | null;
  onPriceUpdate: (price: string) => void;
  symbol?: string;
}

const AdvancedChart = memo(function AdvancedChart({
  tradeLines,
  onPriceUpdate,
  symbol = "BTC/USDT",
}: AdvancedChartProps) {
  const chartInstance = useRef<LightweightCharts.IChartApi | null>(null);
  const seriesRef = useRef<LightweightCharts.ISeriesApi<"Candlestick"> | null>(null);
  const tpFillRef = useRef<LightweightCharts.ISeriesApi<"Baseline"> | null>(null);
  const slFillRef = useRef<LightweightCharts.ISeriesApi<"Baseline"> | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const activeLinesRef = useRef<LightweightCharts.IPriceLine[]>([]);
  const [interval, setInterval] = useState("15m");
  const [isChartReady, setIsChartReady] = useState(false);

  const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d"];

  const updateVisuals = (lines: TradeLines | null) => {
    if (!seriesRef.current || !chartInstance.current) return;

    activeLinesRef.current.forEach((line) => seriesRef.current?.removePriceLine(line));
    activeLinesRef.current = [];
    if (tpFillRef.current) {
      chartInstance.current.removeSeries(tpFillRef.current);
      tpFillRef.current = null;
    }
    if (slFillRef.current) {
      chartInstance.current.removeSeries(slFillRef.current);
      slFillRef.current = null;
    }

    if (!lines) return;

    const { entry, tp, sl, side } = lines;
    const isBuy = side.toUpperCase() === "BUY";

    tpFillRef.current = chartInstance.current.addBaselineSeries({
      baseValue: { type: "price", price: entry },
      topFillColor1: isBuy ? "rgba(0, 230, 118, 0.25)" : "rgba(0,0,0,0)",
      topFillColor2: isBuy ? "rgba(0, 230, 118, 0.05)" : "rgba(0,0,0,0)",
      bottomFillColor1: !isBuy ? "rgba(0, 230, 118, 0.25)" : "rgba(0,0,0,0)",
      bottomFillColor2: !isBuy ? "rgba(0, 230, 118, 0.05)" : "rgba(0,0,0,0)",
      lineVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    slFillRef.current = chartInstance.current.addBaselineSeries({
      baseValue: { type: "price", price: entry },
      topFillColor1: !isBuy ? "rgba(255, 23, 68, 0.25)" : "rgba(0,0,0,0)",
      topFillColor2: !isBuy ? "rgba(255, 23, 68, 0.05)" : "rgba(0,0,0,0)",
      bottomFillColor1: isBuy ? "rgba(255, 23, 68, 0.25)" : "rgba(0,0,0,0)",
      bottomFillColor2: isBuy ? "rgba(255, 23, 68, 0.05)" : "rgba(0,0,0,0)",
      lineVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    const candleData = seriesRef.current.data() as any;
    if (candleData.length > 0) {
      const firstTime = candleData[0].time;
      const lastTime = candleData[candleData.length - 1].time;
      tpFillRef.current.setData([
        { time: firstTime, value: tp },
        { time: lastTime, value: tp },
      ]);
      slFillRef.current.setData([
        { time: firstTime, value: sl },
        { time: lastTime, value: sl },
      ]);
    }

    const eLine = seriesRef.current.createPriceLine({
      price: entry,
      color: isBuy ? "#1e3a8a" : "#FF1744",
      lineWidth: 2,
      lineStyle: LightweightCharts.LineStyle.Solid,
      title: side.toUpperCase(),
    });
    const tLine = seriesRef.current.createPriceLine({
      price: tp,
      color: "#00E676",
      lineWidth: 2,
      lineStyle: LightweightCharts.LineStyle.Solid,
      title: "TAKE PROFIT",
    });
    const sLine = seriesRef.current.createPriceLine({
      price: sl,
      color: "#FF1744",
      lineWidth: 2,
      lineStyle: LightweightCharts.LineStyle.Solid,
      title: "STOP LOSS",
    });

    activeLinesRef.current = [eLine, tLine, sLine];
  };

  useEffect(() => {
    if (!container.current) return;

    const chart = LightweightCharts.createChart(container.current, {
      layout: { background: { color: "#000" }, textColor: "#DDD" },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.05)" },
        horzLines: { color: "rgba(255,255,255,0.05)" },
      },
      width: container.current.clientWidth,
      height: container.current.clientHeight,
      timeScale: { timeVisible: true, borderVisible: false },
      rightPriceScale: { borderVisible: false },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#00E676",
      downColor: "#FF1744",
      borderVisible: false,
      wickUpColor: "#00E676",
      wickDownColor: "#FF1744",
      priceLineColor: "#FFFFFF",
    });

    chartInstance.current = chart;
    seriesRef.current = candleSeries;
    setIsChartReady(true);

    const handleResize = () => {
      if (container.current && chartInstance.current) {
        chartInstance.current.applyOptions({
          width: container.current.clientWidth,
          height: container.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartInstance.current) chartInstance.current.remove();
    };
  }, []);

  useEffect(() => {
    if (!isChartReady || !seriesRef.current) return;

    let isCurrent = true;
    const binanceSymbol = symbol.replace("/", "").toUpperCase();

    if (wsRef.current) {
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    type BinanceKline = [
      number, string, string, string, string,
      string, number, string, number, string, string, string
    ];

    seriesRef.current.setData([]);

    fetch(
      `https://fapi.binance.com/fapi/v1/klines?symbol=${binanceSymbol}&interval=${interval}&limit=300`
    )
      .then((res) => res.json())
      .then((raw: BinanceKline[]) => {
        if (!isCurrent) return;

        const data = raw.map((c: BinanceKline) => ({
          time: (c[0] / 1000) as LightweightCharts.UTCTimestamp,
          open: parseFloat(c[1]),
          high: parseFloat(c[2]),
          low: parseFloat(c[3]),
          close: parseFloat(c[4]),
        }));

        if (seriesRef.current) {
          seriesRef.current.setData(data);
          chartInstance.current?.timeScale().fitContent();
        }

        if (tradeLines) updateVisuals(tradeLines);

        const socket = new WebSocket(
          `wss://fstream.binance.com/ws/${binanceSymbol.toLowerCase()}@kline_${interval}`
        );
        wsRef.current = socket;

        socket.onmessage = (event) => {
          if (!isCurrent) return;
          const k = JSON.parse(event.data).k;
          if (onPriceUpdate) onPriceUpdate(parseFloat(k.c).toFixed(2));

          if (seriesRef.current && isChartReady) {
            try {
              seriesRef.current.update({
                time: (k.t / 1000) as LightweightCharts.UTCTimestamp,
                open: parseFloat(k.o),
                high: parseFloat(k.h),
                low: parseFloat(k.l),
                close: parseFloat(k.c),
              });
            } catch (e) {
              console.warn("Socket update skipped: Chart re-loading");
            }
          }
        };
      });

    return () => {
      isCurrent = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isChartReady, symbol, interval]);

  useEffect(() => {
    if (isChartReady) updateVisuals(tradeLines);
  }, [tradeLines, isChartReady]);

  return (
    <div className="flex-1 w-full bg-black relative overflow-hidden flex flex-col">
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-1 pointer-events-none">
        <h2 className="text-xl font-bold text-white tracking-tighter">{symbol}</h2>
        <div className="flex gap-2 pointer-events-auto">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setInterval(tf)}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded border transition-all",
                interval === tf
                  ? "bg-white text-black border-white"
                  : "bg-black/40 text-white/50 border-white/10 hover:border-white/30"
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

// ─── TradeWidget ──────────────────────────────────────────────────────────────

interface TradeWidgetProps {
  onAccept: () => void;
  onReject: () => void;
  onPriceChange: (lines: TradeLines) => void;
  price: string | null;
  initialData: {
    side?: string;
    symbol?: string;
    leverage?: number | string;
    take_profit?: number | string;
    stop_loss?: number | string;
  };
}

const TradeWidget = memo(function TradeWidget({
  onAccept,
  onReject,
  onPriceChange,
  price,
  initialData,
}: TradeWidgetProps) {
  const [side] = useState(initialData?.side);
  const [amount, setAmount] = useState("10000");
  const [symbol] = useState(initialData?.symbol);
  const [leverage, setLeverage] = useState(initialData?.leverage?.toString());
  const [tp] = useState(initialData?.take_profit?.toString());
  const [sl] = useState(initialData?.stop_loss?.toString());
  const [showMobileTip, setShowMobileTip] = useState(false);

  const displayPrice = price || "0.00";
  const entry = parseFloat(displayPrice);

  const toggleMobileTip = () => {
    if (window.innerWidth < 768) setShowMobileTip(!showMobileTip);
  };

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
        roiPercentage: (roi * 100).toFixed(2),
      };
    }
    return { toWin: "0.00", roiPercentage: "0" };
  }, [amount, leverage, tp, entry, side]);

  useEffect(() => {
    if (onPriceChange) {
      onPriceChange({ entry, tp: parseFloat(tp), sl: parseFloat(sl), side });
    }
  }, [entry, tp, sl, side, onPriceChange]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#191b1b]/40 rounded-2xl p-4 space-y-4 border border-white/[0.05] shadow-2xl transition-opacity"
    >
      <div className="grid grid-cols-2 rounded-xl overflow-hidden font-bold border border-white/5">
        <button
          className={cn(
            "p-3 transition-all text-left cursor-pointer",
            side === "SELL"
              ? "bg-[#FF1744]/20 text-[#FF1744]"
              : "bg-[#2a2b2b] text-[#d1d1d1] opacity-50"
          )}
        >
          <span className="text-[10px] uppercase opacity-70 block mb-1">SELL</span>
          <div className="text-xl tracking-tighter">{displayPrice}</div>
        </button>
        <button
          className={cn(
            "p-3 transition-all text-right cursor-pointer",
            side === "BUY"
              ? "bg-blue-500/20 text-blue-500"
              : "bg-[#2a2b2b] text-[#d1d1d1] opacity-50"
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
              onChange={(e) => {
    const rawValue = e.target.value.replace(/[^0-9.]/g, '');
    setAmount(rawValue);
  }}
              type="text"
              value={amount ? `$${formatUSD(amount)}` : ""}
              className="bg-transparent outline-none text-white text-right text-2xl w-full p-0 focus:ring-0"
              placeholder="$0"
            />
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex justify-between items-center w-full">
            <div className="flex flex-col gap-1">
              <span>To Win 💵</span>
              <span className="text-zinc-500">
                +{roiPercentage}%
                <span className="text-zinc-500 px-2">
                  <Tooltip open={showMobileTip || undefined}>
                    <TooltipTrigger asChild>
                      <button type="button" className="outline-none">
                        <Info
                          onClick={toggleMobileTip}
                          size={13}
                          className="text-zinc-600 hover:text-zinc-300 transition-colors"
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>ROI (Return on Investment)</p>
                    </TooltipContent>
                  </Tooltip>
                </span>
              </span>
            </div>
            <span
              className={cn(
                "text-2xl",
                Number(toWin) < parseFloat(amount)
                  ? "text-red-500"
                  : "text-green-500"
              )}
            >
              {toWin ? `$${Number(toWin).toLocaleString("en-US")}` : "$0"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-white/30 px-1">
              Symbol
            </label>
            <div className="flex items-center gap-2 p-2.5 px-3 rounded-lg bg-[#0d0d0d] border border-white/10">
              <input
                disabled
                type="text"
                value={symbol}
                className="bg-transparent border-none outline-none font-medium text-white text-[13px] w-full p-0 focus:ring-0"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-white/30 px-1">
              Leverage
            </label>
            <div className="flex items-center gap-2 p-2.5 px-3 rounded-lg bg-[#0d0d0d] border border-white/10">
              <input
                 onChange={(e) => setLeverage(e.target.value)}
                type="number"
                value={leverage}
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
              <div className="flex items-center gap-2 p-2.5 px-3 rounded-lg bg-[#0d0d0d] border border-white/10">
                <input
                  disabled
                  type="number"
                  value={tp}
                  className="bg-transparent border-none outline-none text-white text-xs w-full p-0 focus:ring-0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] uppercase text-white/30 px-1">
                Stop loss
              </div>
              <div className="flex items-center gap-2 p-2.5 px-3 rounded-lg bg-[#0d0d0d] border border-white/10">
                <input
                  disabled
                  type="number"
                  value={sl}
                  className="bg-transparent border-none outline-none text-white text-xs w-full p-0 focus:ring-0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        <button
          onClick={onAccept}
          className="flex-1 flex items-center justify-center gap-2 p-2 border-t border-green-700 bg-green-700/20 hover:bg-green-700/30 transition-colors text-green-200 text-xs rounded-l cursor-pointer"
        >
          <Check size={14} /> accept
        </button>
        <button
          onClick={onReject}
          className="flex-1 flex items-center justify-center gap-2 p-2 border-t border-red-700 bg-red-700/20 hover:bg-red-700/30 transition-colors text-red-200 text-xs rounded-r cursor-pointer"
        >
          x reject
        </button>
      </div>
    </motion.div>
  );
});



// ─── Main Component ───────────────────────────────────────────────────────────

export default function VibeTradingUI({ data }: { data: MarketData }) {
  const router = useRouter();

  const [showAgent, setShowAgent] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<string | null>(null);
  const [activeLines, setActiveLines] = useState<TradeLines | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Derive active lines from incoming data
  const initialTradeLines: TradeLines = {
    entry: parseFloat(currentPrice || "0"),
    tp: parseFloat(data.tp),
    sl: parseFloat(data.sl),
    side: data.side,
  };

  const handleAccept = () => {
    router.push("/dashboard");
  };

  const handleReject = () => {
    // do nothing
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-[#d1d1d1] overflow-hidden font-sans select-none">
      {/* LEFT: Chart */}
      <div className="flex-[7] flex flex-col min-w-0">
        <AdvancedChart
          symbol={data.symbol}
          tradeLines={activeLines ?? initialTradeLines}
          onPriceUpdate={setCurrentPrice}
        />
      </div>

      {/* Mobile toggle */}
      <button
        onClick={() => setShowAgent(!showAgent)}
        className="md:hidden fixed bottom-2 right-6 z-45 p-2 px-3 bg-black text-white border rounded-xl transition-transform"
      >
        {showAgent ? "chart" : "agent"}
      </button>

      {/* RIGHT: Agent Panel */}
      <div
        className={cn(
          "flex-[3] flex flex-col bg-black min-w-[320px] max-w-[450px] transition-all",
          !showAgent
            ? "hidden md:flex"
            : "fixed inset-0 z-40 md:relative md:inset-auto"
        )}
      >
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {/* Research Summary Message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-2 items-start"
          >
            <div className="space-y-2 flex flex-col w-full">
              <div className="p-3.5 text-zinc-200">{data.summary}</div>
              <div className="px-3 underline text-zinc-200">Timeline: {data.timeline}</div>
              <div className="p-3.5 text-xl text-zinc-200 flex justify-between items-center w-full">
                <h1 className="font-semibold text-zinc-200">
                  Win Rate {data.odds}%
                </h1>
                <h1 className="text-zinc-200 font-light theseason">RICHACLE</h1>
              </div>
            </div>
          </motion.div>

          {/* Trade Widget */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <TradeWidget
              initialData={{
                side: data.side,
                symbol: data.symbol,
                leverage: data.leverage,
                take_profit: data.tp,
                stop_loss: data.sl,
              }}
              onPriceChange={setActiveLines}
              onAccept={handleAccept}
              onReject={handleReject}
              price={currentPrice}
            />
          </motion.div>

          <div ref={chatEndRef} />
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      `,
        }}
      />
    </div>
  );
}