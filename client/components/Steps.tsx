"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  ChevronDown,
  ChevronRight,
  ArrowUp,
  Infinity as InfinityIcon,
  Check,
  ArrowUpRight,
  Plus,
  Search,
  FileSearch2,
  Sparkles,
  Info,
} from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"

/* -------------------------------------------------------------------------- */
/*  ORIGINAL — untouched                                                      */
/* -------------------------------------------------------------------------- */

function ModelSelectorCard() {
  const [modelOpen, setModelOpen] = useState(true)
  const [selectedModel, setSelectedModel] = useState("Claude Fable 5")

  const models = [
    { name: "Auto", tag: "Suggested" },
    { name: "Claude Fable 5" },
    { name: "GPT-5.6 Sol" },
    { name: "Gemini 3.1 Pro" },
    { name: "Grok 4.5" },
    { name: "Deepseek V3.2" },
  ]

  return (
    <div className="w-full max-w-md">
      {/* Heading */}
      <h1 className="text-white text-xl font-semibold tracking-tight">
        Use the best model for every trade
      </h1>
      <p className="text-neutral-400  mt-2 ">
        Choose between every cutting edge model from OpenAI, Anthropic,
        Gemini, SpaceXAI, and High-Flyer.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-orange-500 text-sm font-medium mt-3 hover:text-orange-400 transition-colors"
      >
        Explore models
        <ChevronRight />
      </Link>

      {/* Card */}
      <div className="mt-6 rounded-2xl  md:p-3 relative">
        <div className="rounded-xl bg-neutral-900/60 px-4 pt-4 pb-3">
          <p className="text-neutral-400 text-sm">Ask Richacle to research or predict trade</p>

          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-3">
              <button className="flex items-center cursor-pointer gap-1.5 text-neutral-300 text-sm bg-neutral-800/70 rounded-full p-3 hover:bg-neutral-800 transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setModelOpen((o) => !o)}
                className="flex items-center gap-1.5 cursor-pointer text-neutral-300 text-sm px-1 py-1.5 hover:text-white transition-colors"
              >
                {selectedModel}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <button className="w-8 h-8 cursor-pointer rounded-full bg-white flex items-center justify-center hover:bg-neutral-200 transition-colors">
              <ArrowUp className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>

        {/* Dropdown */}
        {modelOpen && (
          <div className="absolute left-24 top-[92px] w-56 rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl py-1.5 z-10">
            {models.map((model) => (
              <button
                key={model.name}
                onClick={() => {
                  setSelectedModel(model.name)
                  setModelOpen(false)
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {model.name}
                  {model.tag && (
                    <span className="text-neutral-500 text-xs ">{model.tag}</span>
                  )}
                </span>
                {selectedModel === model.name && (
                  <Check className="w-3.5 h-3.5 text-neutral-300 " />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  NEW — codebase understanding / search animation card                     */
/* -------------------------------------------------------------------------- */

const QUERY = "What's the Crypto Market Condition?"

const STEPS = [
  { label: "Thinking", labeled: "Thinked",  detail: "Choose a Bitcoin" },
  { label: "Researching",labeled: "Researched", detail: "Bitcoin market condition?" },
  { label: "Predicting",labeled: "Predicted",  detail: "Highest win rate found" },
]

// Timing (ms)
const TYPE_SPEED = 28
const STEP_GAP = 2000
const HOLD_AFTER_DONE = 1400
const RESET_PAUSE = 500

function SearchAnimationCard() {
  // phase: "typing" | "steps" | "done" | "reset"
  const [phase, setPhase] = useState("typing")
  const [typedLen, setTypedLen] = useState(0)
  const [activeStep, setActiveStep] = useState(-1) // index of step currently "active"
  const [doneSteps, setDoneSteps] = useState<number[]>([])
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t))
    timers.current = []
  }
const after = (ms: number, fn: () => void) => {
  const id = setTimeout(fn, ms)
  timers.current.push(id)
  return id
}

  useEffect(() => {
    clearTimers()

    if (phase === "typing") {
      setTypedLen(0)
      setActiveStep(-1)
      setDoneSteps([])
      let i = 0
      const tick = () => {
        i += 1
        setTypedLen(i)
        if (i < QUERY.length) {
          after(TYPE_SPEED, tick)
        } else {
          after(450, () => setPhase("steps"))
        }
      }
      after(TYPE_SPEED, tick)
    }

    if (phase === "steps") {
      STEPS.forEach((_, idx) => {
        after(idx * STEP_GAP, () => setActiveStep(idx))
        after(idx * STEP_GAP + STEP_GAP - 150, () =>
          setDoneSteps((prev) => [...prev, idx])
        )
      })
      after(STEPS.length * STEP_GAP, () => setPhase("done"))
    }

    if (phase === "done") {
      after(HOLD_AFTER_DONE, () => setPhase("reset"))
    }

    if (phase === "reset") {
      after(RESET_PAUSE, () => setPhase("typing"))
    }

    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const fadeOut = phase === "reset"

  return (
    <div className="w-full max-w-md">
      {/* Heading */}
      <h1 className="text-white text-xl font-semibold tracking-tight">
        Complete market understanding
      </h1>
      <p className="text-neutral-400 mt-2">
        Richacle learns how market works, no matter the news, social or trump.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-orange-500 text-sm font-medium mt-3 hover:text-orange-400 transition-colors"
      >
        Learn about market insights
        <ChevronRight/>
      </Link>

      {/* Card */}
      <div className="mt-6 rounded-2xl md:p-3 relative">
        <Card className="rounded-xl bg-neutral-900/60 border-0 px-4 pt-4 pb-4 min-h-[190px]">
          <CardContent className="p-0 flex flex-col gap-4">
            {/* query bubble */}
            <div
              className={`rounded-lg bg-neutral-800/80 px-3.5 py-2.5 text-sm text-neutral-200 w-fit max-w-full transition-opacity duration-300 ${
                fadeOut ? "opacity-0" : "opacity-100"
              }`}
            >
              {QUERY.slice(0, typedLen)}
              {phase === "typing" && (
                <span className="inline-block w-[2px] h-[14px] bg-neutral-400 ml-0.5 align-middle animate-pulse" />
              )}
            </div>

            {/* steps */}
            <div
              className={`flex flex-col gap-2 pl-0.5 transition-opacity duration-300 ${
                fadeOut ? "opacity-0" : "opacity-100"
              }`}
            >
              {STEPS.map((step, idx) => {
                const isVisible = activeStep >= idx
                const isDone = doneSteps.includes(idx)
                const isActive = activeStep === idx && !isDone
               

                return (
                  <div
                    key={step.label}
                    className={`flex items-center gap-2 text-sm transition-all duration-500 ease-out ${
                      isVisible
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-1"
                    }`}
                  >
                    <span
                      className={`font-medium ${
                        isDone
                          ? "text-neutral-400"
                          : isActive
                          ? "text-white animate-pulse"
                          : "text-neutral-500"
                      }`}
                    >
                    {isDone ? <>{step.labeled}</> : <>{step.label}</>}
                    </span>
                    {isDone && <span className="text-neutral-500 text-xs">
                      {step.detail}
                    </span>}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  NEW — predicted trade preview card                                       */
/* -------------------------------------------------------------------------- */

function PredictedTradeCard() {
  const entry = 64500
  const toWin = 136430
  const roi = 36.43
  const symbol = "BTCUSDT"
  const leverage = 10
  const tp = 66850
  const sl = 63500

  const [amount, setAmount] = useState<number | string>(100000)

   const formatUSD = (value: string | number) => {
    if (!value && value !== 0) return ""
    const num = Number(value)
    if (Number.isNaN(num)) return ""
    return num.toLocaleString("en-US")
  }

  return (
    <div className="w-full max-w-md">
      {/* Heading */}
      <h1 className="text-white text-xl font-semibold tracking-tight">
         Oracle technical analysis
      </h1>
      <p className="text-neutral-400 mt-2">
        Oracle agent set ready to place order entry,
        take profit, stop loss, leverage and risk management.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-orange-500 text-sm font-medium mt-3 hover:text-orange-400 transition-colors"
      >
        See prediction accuracy
        <ChevronRight className="w-4 h-4" />
      </Link>

      {/* Card */}
      <div className="mt-6 rounded-2xl bg-[#0d0d0d] border border-white/[0.06] p-3 space-y-2.5 text-xs">
        {/* Sell / Buy strip */}
        <div className="grid grid-cols-2 rounded-lg overflow-hidden font-bold">
          <div className="p-2 text-left bg-[#2a2b2b] text-[#d1d1d1] opacity-50 cursor-pointer">
            <span className="text-[8px] uppercase opacity-70 block mb-0.5">Sell</span>
            <div className="text-sm tracking-tighter">{entry.toLocaleString("en-US")}</div>
          </div>
          <div className="p-2 text-right bg-blue-500/20 text-blue-400 cursor-pointer">
            <span className="text-[8px] uppercase opacity-70 block mb-0.5">Buy</span>
            <div className="text-sm tracking-tighter">{entry.toLocaleString("en-US")}</div>
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-1">
          <div className="text-[9px] uppercase text-white/30 px-0.5">Amount</div>
            <div className="flex items-center py-2 border-b border-white/10 transition-all">
            <input
            readOnly
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

        {/* To Win */}
        <div className="flex justify-between items-end">
          <div className="flex flex-col gap-0.5">
            <span className="text-white">To Win</span>
            <span className="text-zinc-500">
              +{roi}%
              <Info size={11} className="inline ml-1 text-zinc-600" />
            </span>
          </div>
          <span className=" text-2xl text-green-500">
            ${toWin.toLocaleString("en-US")}
          </span>
        </div>

        {/* Symbol / Leverage */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[9px] uppercase tracking-wider text-white/30 px-0.5  ">
              Symbol
            </label>
            <div className="flex items-center p-2 px-2.5 rounded-lg bg-[#161616] border border-white/10">
              <span className="text-white font-medium">{symbol}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-wider text-white/30 px-0.5 ">
              Leverage
            </label>
            <div className="flex items-center gap-1.5">
              <button className="w-6 h-6 rounded bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
                −
              </button>
              <div className="flex-1 text-center text-white font-bold text-base tracking-tight">
                {leverage}
                <span className="text-white text-xs font-normal">x</span>
              </div>
              <button className="w-6 h-6 rounded bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
                +
              </button>
            </div>

            <div className="relative px-1 py-2">
              {/* Track */}
              <div className="relative h-[3px] rounded-full bg-white/15 mx-1">
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-white transition-all"
                  style={{ width: `${((leverage - 1) / 124) * 100}%` }}
                />
                {/* Thumb dot */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-black shadow transition-all"
                  style={{ left: `${((leverage - 1) / 124) * 100}%` }}
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
               readOnly
                type="range"
                min={1}
                max={125}
                step={1}
                value={leverage}
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

        {/* Take Profit / Stop Loss */}
        <div className="grid grid-cols-1 gap-2">
          <div className="space-y-1">
            <div className="text-[9px] uppercase text-white/30 px-0.5">Take profit</div>
            <div className="p-2 px-2.5 rounded-lg bg-[#161616] border border-white/10">
              <span className="text-white">{tp.toLocaleString("en-US")}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[9px] uppercase text-white/30 px-0.5">Stop loss</div>
            <div className="p-2 px-2.5 rounded-lg bg-[#161616] border border-white/10">
              <span className="text-white">{sl.toLocaleString("en-US")}</span>
            </div>
          </div>
        </div>

        {/* Accept / Reject */}
        <div className="flex  pt-0.5">
          <button className="flex-1 flex items-center justify-center gap-2 p-2 border-t border-green-700 bg-green-700/20 hover:bg-green-700/30 transition-colors text-green-200 text-xs rounded-bl cursor-pointer">
            <Check className="w-3 h-3" />
            Accept
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 p-2 border-t border-red-700 bg-red-700/20 hover:bg-red-700/30 transition-colors text-red-200 text-xs rounded-br cursor-pointer">
            ✕ Reject
          </button>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Combined layout — updated to include the third card                     */
/* -------------------------------------------------------------------------- */

export default function Steps() {
  return (
    <div className="bg-black w-full p-10 my-10">
      <div className="w-full md:max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-12">
        <ModelSelectorCard />
        <SearchAnimationCard />
        <PredictedTradeCard />
      </div>
    </div>
  )
}