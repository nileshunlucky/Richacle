"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, TrendingUp, Info, Plus, ArrowUp, LoaderCircle, ChevronRight } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import Link from "next/link";


// ---- Replace with your real quotes ----
const TESTIMONIALS = [
  {
    quote:
      "We shipped our Q3 roadmap two weeks early. It felt like adding a senior engineer to the team overnight.",
    name: "Priya Nair",
    role: "Head of Engineering, Loopwave",
  },
  {
    quote:
      "The first tool that actually understands our codebase instead of just autocompleting lines.",
    name: "Marcus Webb",
    role: "CTO, Ferro Systems",
  },
  {
    quote:
      "Onboarded three new hires in a single sprint. They were reviewing PRs by day two.",
    name: "Sana Ahmed",
    role: "Eng Manager, Northcove",
  },
]

// =========================================================
// FAKE TRADE DEMO — purely decorative, no real data/APIs
// =========================================================

// Deterministic seeded PRNG so server-rendered and client-rendered
// output match exactly (fixes the hydration mismatch that Math.random()
// was causing).
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Random-walk "bridge" path that starts at `start` and lands exactly on `end`
function generatePath(
  steps: number,
  start: number,
  end: number,
  vol: number,
  rng: () => number
) {
  const raw = [0]
  for (let i = 1; i <= steps; i++) {
    const noise = (rng() - 0.5) * Math.abs((end - start) / steps) * vol * 4
    raw.push(raw[i - 1] + noise)
  }
  const endVal = raw[steps]
  const total = end - start
  const result: number[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const corrected = raw[i] - t * endVal
    result.push(start + total * t + corrected)
  }
  result[steps] = end
  return result
}

const DEMO_ENTRY = 64500
const DEMO_TP = 66850
const DEMO_SL = 63500
const DEMO_STEPS = 100 // Increased to add more candles and fill the UI
const CHART_SEED = 20240712



const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1D"]

function TimeframeSelector() {

  const [tf, setTf] = useState("15m")
  return (
    <Select value={tf} onValueChange={setTf}>
                <SelectTrigger className="border-none bg-transparent p-2 focus:ring-0 focus:ring-offset-0 gap-1 text-[11px] font-semibold text-white/70 hover:text-white transition-colors cursor-pointer outline-none">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent side="top" sideOffset={3} align="start" position="popper" className="text-white border-0">
                  {TIMEFRAMES.map((t) => (
                    <SelectItem
                      key={t}
                      value={t}
                      className="text-[11px] font-semibold focus:text-white cursor-pointer transition-colors"
                    >
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
  )
}

function FakeTradeChart() {
  // Single seeded RNG instance -> identical output on server & client.
  const { candles } = useMemo(() => {
    const rng = mulberry32(CHART_SEED)
    const path = generatePath(DEMO_STEPS, 64200, DEMO_TP, 1.8, rng)
    const candles = path.slice(0, -1).map((open, i) => {
      const close = path[i + 1]
      const jitter = Math.abs(close - open) * 0.4 + 25
      return {
        open,
        close,
        high: Math.max(open, close) + rng() * jitter,
        low: Math.min(open, close) - rng() * jitter,
      }
    })
    return { candles }
  }, [])

  const [revealed, setRevealed] = useState(4)
  const [livePrice, setLivePrice] = useState(candles[3]?.close ?? DEMO_ENTRY)

  useEffect(() => {
    const id = setInterval(() => {
      setRevealed((prev) => {
        const next = prev >= candles.length ? 4 : prev + 1
        setLivePrice(candles[Math.min(next, candles.length) - 1].close)
        return next
      })
    }, 150)
    return () => clearInterval(id)
  }, [candles])

  const min = Math.min(DEMO_SL, ...candles.map((c) => c.low)) - 150
  const max = Math.max(DEMO_TP, ...candles.map((c) => c.high)) + 150

  const W = 800
  const H = 600
  const padRight = 60
  const chartW = W - padRight
  const candleW = chartW / (candles.length + 10)

  const yFor = (price: number) => H - ((price - min) / (max - min)) * H
  const isBuy = DEMO_TP > DEMO_ENTRY

  // Helper to calculate PnL based on a $10,000 amount and 10x leverage
  const getPnL = (price: number) => {
    const amount = 10000
    const leverage = 10
    const pnl = amount * leverage * ((price - DEMO_ENTRY) / DEMO_ENTRY)
    const sign = pnl >= 0 ? "+" : ""
    return `${sign}${pnl.toLocaleString("en-US", { maximumFractionDigits: 0 })} USD`
  }

  return (
    <div className="relative w-full h-full bg-black flex flex-col">
      <div className="text-[11px] text-white/40 mb-2 flex items-center gap-2 shrink-0">
        <span className="flex items-center gap-2">
          <span className="text-white font-semibold">BTCUSDT</span>
        </span>
        <TimeframeSelector />
      </div>

      <div className="relative w-full flex-1 min-h-0">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
          {/* grid */}
          {[0.2, 0.4, 0.6, 0.8].map((t) => (
            <line
              key={t}
              x1={0}
              x2={W}
              y1={H * t}
              y2={H * t}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
            />
          ))}

          {/* SL / Entry / TP lines */}
          <line x1={0} x2={chartW} y1={yFor(DEMO_SL)} y2={yFor(DEMO_SL)} stroke="#FF1744" strokeWidth={1.5} />
          <line x1={0} x2={chartW} y1={yFor(DEMO_ENTRY)} y2={yFor(DEMO_ENTRY)} stroke={isBuy ? "#3b82f6" : "#FF1744"} strokeWidth={1.5} />
          <line x1={0} x2={chartW} y1={yFor(DEMO_TP)} y2={yFor(DEMO_TP)} stroke="#00E676" strokeWidth={1.5} />
          <line x1={0} x2={chartW} y1={yFor(livePrice)} y2={yFor(livePrice)} stroke="#808080" strokeWidth={1.5} strokeDasharray="6 4"/>

          {/* candles */}
          {candles.slice(0, revealed).map((c, i) => {
            const x = 6 + i * candleW
            const up = c.close >= c.open
            const color = up ? "#00E676" : "#FF1744"
            const bodyTop = yFor(Math.max(c.open, c.close))
            const bodyBottom = yFor(Math.min(c.open, c.close))
            return (
              <g key={i}>
                <line
                  x1={x + candleW / 2}
                  x2={x + candleW / 2}
                  y1={yFor(c.high)}
                  y2={yFor(c.low)}
                  stroke={color}
                  strokeWidth={1}
                />
                <rect
                  x={x}
                  y={bodyTop}
                  width={Math.max(candleW - 2, 1.5)}
                  height={Math.max(bodyBottom - bodyTop, 1.5)}
                  fill={color}
                />
              </g>
            )
          })}
        </svg>

        {/* dynamically positioned right-edge price labels using calculated percentages */}
        <div className="absolute inset-0 pointer-events-none">
          {/* TP Label */}
          <div 
            className="absolute right-1 -translate-y-1/2 flex items-center gap-2 bg-black border border-[#00E676] text-[#00E676] text-xs font-semibold px-3 py-1 rounded-lg"
            style={{ top: `${(yFor(DEMO_TP) / H) * 100}%` }}
          >
            <span>1.5504</span>
            |
            <span className="flex items-center">{getPnL(DEMO_TP)}</span>
          </div>

          {/* Live Price Label */}
          <div 
            className="absolute right-1 -translate-y-1/2 flex items-center gap-2 text-xs font-semibold pr-3 rounded-lg transition-all duration-150"
            style={{ top: `${(yFor(livePrice) / H) * 100}%` }}
          >
            <span className="bg-zinc-900 p-2 px-4 rounded text-white">
              {livePrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>
          </div>

          {/* Entry Price Label */}
          <div 
            className="absolute right-1 -translate-y-1/2 flex items-center gap-2 bg-black border border-blue-500 text-blue-500 text-xs font-semibold pr-3 rounded-lg transition-all duration-150"
            style={{ top: `${(yFor(DEMO_ENTRY) / H) * 100}%` }}
          >
            <span className="bg-blue-500 p-1 px-2 rounded-l-lg text-white">
             1.5504
            </span>
            <span className="flex items-center">
              {getPnL(livePrice)}
            </span>
          </div>

          {/* SL Label */}
          <div 
            className="absolute right-1 -translate-y-1/2 flex items-center gap-2 bg-black border border-[#FF1744] text-[#FF1744] text-xs font-semibold px-3 py-1 rounded-lg"
            style={{ top: `${(yFor(DEMO_SL) / H) * 100}%` }}
          >
            1.5504
            |
            <span className="flex items-center">{getPnL(DEMO_SL)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const MODELS = [
  { id: "claude-fable-5", name: "Claude Fable 5" },
  { id: "gpt-5.6-sol", name: "GPT-5.6 Sol" },
  { id: "gemini-3.1", name: "Gemini 3.1 Pro" },
  { id: "grok-4.5", name: "Grok 4.5" },
  { id: "deepseek-v3.2", name: "Deepseek V3.2" },
]

function FakeTradeChat() {
  const [symbol] = useState("BTCUSDT")
  const [side] = useState<"buy" | "sell">("buy")

  const [amount, setAmount] = useState("10000")
  const [leverage, setLeverage] = useState("10")
  const [tp, setTp] = useState(String(DEMO_TP))
  const [sl, setSl] = useState(String(DEMO_SL))

  const [disabled, setDisabled] = useState(false)
  const [capturedEntry, setCapturedEntry] = useState<number | null>(null)
  const [pnl, setPnl] = useState(0)
  const [showMobileTip, setShowMobileTip] = useState(false)
  const [showModeMenu, setShowModeMenu] = useState(false)

  const toggleMobileTip = () => setShowMobileTip((v) => !v)

  // ---- fake prompt bar (purely decorative, no real backend) ----
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id)
  const [extraMessages, setExtraMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const text = prompt.trim()
    if (!text || loading) return

    setExtraMessages((prev) => [...prev, { role: "user", content: text }])
    setPrompt("")
    setLoading(true)

    // fake canned reply, no real request is made
    setTimeout(() => {
   const isTradeCmd = /\/(scalp-trade|swing-trade|day-trade)/i.test(text)
      setExtraMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: isTradeCmd
            ? "Scanning live order book and momentum signals for a fresh setup..."
            : "This is a preview — sign up to run Richacle on your own portfolio.",
        },
      ])
      setLoading(false)
    }, 1200)
  }

  const formatUSD = (value: string | number) => {
    if (!value && value !== 0) return ""
    const num = Number(value)
    if (Number.isNaN(num)) return ""
    return num.toLocaleString("en-US")
  }

  const roiPercentage = useMemo(() => {
    const amt = parseFloat(amount) || 0
    const lev = parseInt(leverage) || 1
    const tpVal = parseFloat(tp) || DEMO_TP
    if (!amt) return "0.00"
    const pct = ((tpVal - DEMO_ENTRY) / DEMO_ENTRY) * lev * 100
    return pct.toFixed(2)
  }, [amount, leverage, tp])

  const toWin = useMemo(() => {
    const amt = parseFloat(amount) || 0
    const pct = parseFloat(roiPercentage) || 0
    return (amt + amt * (pct / 100)).toFixed(2)
  }, [amount, roiPercentage])

  // Live PnL ticker — only runs once the (fake) order has been accepted.
  useEffect(() => {
    if (!disabled) return
    const entry = capturedEntry ?? DEMO_ENTRY
    const amt = parseFloat(amount) || 0
    const lev = parseInt(leverage) || 1
    const tpVal = parseFloat(tp) || DEMO_TP

    const id = setInterval(() => {
      setPnl((prev) => {
        const target = amt * lev * ((tpVal - entry) / entry)
        const step = (target - prev) * 0.15 + (Math.random() - 0.5) * 4
        return prev + step
      })
    }, 700)
    return () => clearInterval(id)
  }, [disabled, capturedEntry, amount, leverage, tp])

  

  const handleReject = () => {
    setDisabled(false)
    setCapturedEntry(null)
    setPnl(0)
    setAmount("10000")
    setLeverage("10")
    setTp(String(DEMO_TP))
    setSl(String(DEMO_SL))
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
    <div className="flex-1 overflow-y-auto p-3 space-y-3 text-[12px]">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
        <div className="max-w-[85%] bg-zinc-900 text-white px-3 py-2 rounded-lg rounded-tr-none">
  <span className="bg-blue-950/60 text-blue-300 rounded px-1">/scalp-trade</span> on Bitcoin.
</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-[#d1d1d1] pl-1 leading-relaxed"
      >
        Bitcoin Momentum, funding rate, and order book depth line up for a long. Setting entry near current price with a 1:3 risk/reward.
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex justify-between items-center text-white"
      >
        <span className="font-semibold">Win Rate 82%</span>
        <span className="font-light theseason text-sm">RICHACLE</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-zinc-950/50 rounded-xl p-3 space-y-3 border border-white/[0.06]"
      >
        <div className="grid grid-cols-2 rounded-lg overflow-hidden font-bold ">
          <div
            className={cn(
              "p-2 text-left bg-[#2a2b2b] text-[#d1d1d1]",
              side === "sell" ? "" : "opacity-50"
            )}
          >
            <span className="text-[9px] uppercase opacity-70 block mb-0.5">SELL</span>
            <div className="text-sm tracking-tighter">{DEMO_ENTRY.toLocaleString("en-US")}</div>
          </div>
          <div
            className={cn(
              "p-2 text-right bg-blue-500/20 text-blue-400",
              side === "buy" ? "" : "opacity-50"
            )}
          >
            <span className="text-[9px] uppercase opacity-70 block mb-0.5">BUY</span>
            <div className="text-sm tracking-tighter">{DEMO_ENTRY.toLocaleString("en-US")}</div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase  text-white/30 px-1">
            Amount
          </div>
          <div className="flex items-center py-2 border-b border-white/10 transition-all">
            <input
              disabled={disabled}
              type="text"
              inputMode="decimal"
              value={amount ? `$${formatUSD(amount)}` : ""}
              onChange={(e) => {
                const rawValue = e.target.value.replace(/[^0-9.]/g, "")
                setAmount(rawValue)
              }}
              className="bg-transparent outline-none text-white text-right text-2xl w-full p-0 focus:ring-0 disabled:opacity-60"
              placeholder="$0"
            />
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex justify-between items-center w-full">
            <div className="flex flex-col gap-1">
              <span>To Win</span>
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
                Number(toWin) < (parseFloat(amount) || 0) ? "text-red-500" : "text-green-500"
              )}
            >
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
                readOnly
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
                onClick={() => setLeverage((v) => String(Math.max(1, parseInt(v) - 1)))}
                className="w-8 h-8 rounded bg-white/10 text-white text-lg flex items-center justify-center hover:bg-white/20 disabled:opacity-30 cursor-pointer"
              >
                −
              </button>

              <div className="flex-1 text-center text-white font-bold text-xl tracking-tight">
                {leverage}
                <span className="text-white text-base font-normal">x</span>
              </div>

              <button
                disabled={disabled}
                onClick={() => setLeverage((v) => String(Math.min(125, parseInt(v) + 1)))}
                className="w-8 h-8 rounded bg-white/10 text-white text-lg flex items-center justify-center hover:bg-white/20 disabled:opacity-30 cursor-pointer"
              >
                +
              </button>
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
                {[1, 25, 50, 75, 100, 125].map((v) => (
                  <div
                    key={v}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full border border-white/30"
                    style={{
                      left: `${((v - 1) / 124) * 100}%`,
                      background: "#ffffff",
                    }}
                  />
                ))}
              </div>

              {/* Invisible range input */}
              <input
                disabled={disabled}
                type="range"
                min={1}
                max={125}
                step={1}
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>

            {/* Tick labels */}
            <div className="flex justify-between text-[9px] text-white/25 px-1">
              {[1, 25, 50, 75, 100, 125].map((v) => (
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

        {!disabled ? (
          <div className="flex -mx-3 -mb-3 pt-1 p-3">
            <button
          
              className="flex-1 flex items-center justify-center gap-2 p-2 border-t border-green-700 bg-green-700/20 hover:bg-green-700/30 transition-colors text-green-200 text-xs rounded-bl cursor-pointer"
            >
              <Check size={14} /> accept
            </button>
            <button
              onClick={handleReject}
              className="flex-1 flex items-center justify-center gap-2 p-2 border-t border-red-700 bg-red-700/20 hover:bg-red-700/30 transition-colors text-red-200 text-xs rounded-br cursor-pointer"
            >
              x reject
            </button>
          </div>
        ) : (
          <div className="flex justify-between items-center pt-1">
            <span className="flex items-center gap-1 text-[11px] text-white/60">
              <Check size={12} className="text-green-400" /> Order placed
            </span>
            <span className={pnl >= 0 ? "text-green-400 text-[12px] font-semibold" : "text-red-400 text-[12px] font-semibold"}>
              {pnl >= 0 ? "+" : ""}
              {pnl.toFixed(2)} USD
            </span>
          </div>
        )}
      </motion.div>

      {extraMessages.map((m, i) =>
        m.role === "user" ? (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end"
          >
            <div className="max-w-[85%] bg-zinc-900 text-white px-3 py-2 rounded-lg rounded-tr-none">
              {m.content}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[#d1d1d1] pl-1 leading-relaxed"
          >
            {m.content}
          </motion.div>
        )
      )}

      {loading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white/40 pl-1 flex items-center gap-2"
        >
          <LoaderCircle className="animate-spin" size={12} strokeWidth={2.5} />
          thinking...
        </motion.div>
      )}
    </div>

    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="p-4"
      >
        <div className="relative bg-[#0d0d0d] rounded-2xl p-4 flex flex-col min-h-[110px] focus-within:border-white/20 transition-all">
          <div className="relative w-full">
            {/* Highlighted text layer — purely visual, sits behind the textarea */}
            <div
              aria-hidden="true"
              className="absolute inset-0 w-full text-[13px] px-0 py-0 whitespace-pre-wrap break-words pointer-events-none"
              style={{ fontFamily: "inherit", lineHeight: "inherit" }}
            >
            {prompt.split(/(\/scalp-trade|\/swing-trade|\/day-trade)/gi).map((part, i) =>
  /^\/(scalp-trade|swing-trade|day-trade)$/i.test(part) ? (
    <span key={i} className="bg-blue-950/60 text-blue-300 rounded">
      {part}
    </span>
  ) : (
    <span key={i} className="text-white">
      {part}
    </span>
  )
)}
              {/* trailing space so caret has room to sit after last char */}
              {prompt.length === 0 && <span className="text-white/50">Ask Richacle</span>}
            </div>

            {/* Actual textarea — text made transparent, only caret/selection visible */}
            <textarea
              ref={textareaRef}
              rows={2}
              maxLength={70}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder=""
              className="relative w-full bg-transparent border-none outline-none focus:ring-0 text-[13px] px-0 py-0 resize-none text-transparent caret-white"
            />
          </div>
          <div className="flex justify-between items-center mt-auto">
            <div className="flex items-center gap-2">
              <div className="relative">
  <Plus
    size={28}
    onClick={() => setShowModeMenu((v) => !v)}
    className="hover:bg-zinc-900 p-1.5 rounded-full cursor-pointer text-white/70"
  />
  {showModeMenu && (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setShowModeMenu(false)} />
      <div className="absolute bottom-10 p-1 left-0 bg-[#141414]  rounded-lg overflow-hidden z-50 min-w-[150px] shadow-xl">
        {["scalp-trade", "swing-trade", "day-trade"].map((mode) => (
          <button
            key={mode}
            onClick={() => {
              setPrompt((prev) => (prev ? `${prev} /${mode} ` : `/${mode} `))
              setShowModeMenu(false)
              textareaRef.current?.focus()
            }}
            className="block w-full text-left px-3 rounded-lg py-2 text-xs hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            /{mode}
          </button>
        ))}
      </div>
    </>
  )}
</div>

              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className=" border-none bg-transparent p-2 focus:ring-0 focus:ring-offset-0 gap-1 text-[11px] font-semibold text-white/70  hover:text-white transition-colors cursor-pointer outline-none">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent side="top" sideOffset={3} align="start" position="popper" className="text-white border-0">
                  {MODELS.map((model) => (
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
            </div>
            <button
              disabled={!prompt.trim() || loading}
              className={`p-1.5 bg-white cursor-pointer text-black rounded-full transition-all active:scale-90 shadow-xl ${
                !prompt.trim() || loading ? "opacity-50 hover:opacity-50" : "hover:opacity-80"
              }`}
            >
              {loading ? (
                <LoaderCircle className="animate-spin" size={16} strokeWidth={2.5} />
              ) : (
                <ArrowUp size={16} strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
    </div>
  )
}

function FakeTradeDemo() {
  return (
    <div className="border-b border-white/10 bg-black flex flex-col md:flex-row">
      <div className="flex-1 items-center justify-center flex h-[260px] md:h-full border-b md:border-0  border-white/10 p-4">
        <FakeTradeChart />
      </div>
      <div className="w-full md:w-[360px] h-[420px] md:h-[700px] flex flex-col bg-black overflow-hidden">
        <FakeTradeChat />
      </div>
    </div>
  )
}

// =========================================================
// HERO
// =========================================================

export default function Hero() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % TESTIMONIALS.length)
    }, 4500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="bg-black w-full">
    
      {/* ---------- Hero copy ---------- */}
      <section className="mx-auto max-w-5xl px-6 pt-28 pb-16 text-center sm:pt-36 flex items-center flex-col gap-10" >
        <h1 className="md:text-6xl text-2xl font-semibold pulse">
          Richacle is your oracle agent
          <br />
          for researching & predicting trade.
        </h1>

        <div className=" flex items-center justify-center gap-3 sm:flex-row">
          <Link href="/dashboard"><button className="cursor-pointer inline-flex items-center  rounded-full bg-white px-6 py-3 text-sm font-medium text-[#0B0A08] transition hover:bg-white/90">
            Get started
          </button></Link>
          <Link href="/explore"><button className="cursor-pointer inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]">
            Richacle list
          </button></Link>
        </div>

        <Link href="/dashboard"><h1 className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 bg-clip-text text-transparent  font-semibold md:text-xl flex items-center justify-center gap-1 cursor-pointer">
          Learn more about oracle agent <ChevronRight className="text-white" />
        </h1></Link>
      </section>

      

      {/* ---------- "App window" testimonial mockup ---------- */}
      <section className="mx-auto max-w-7xl px-4 pb-28 sm:px-6 bg-black">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]">
          {/* title bar */}
          <div className="flex items-center gap-4 border-b border-white/10 bg-[#1B1815] px-4 py-2.5">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            </div>
            <div className="flex flex-1 justify-center">
              <div className="flex items-center gap-2 rounded-md  px-3   text-white/60">
                richacle.com/dashboard
              </div>
            </div>
            <div className="w-12" />
          </div>

      
          <FakeTradeDemo />
        </div>
      </section>
    </div>
  )
}