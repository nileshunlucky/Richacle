"use client"

import React, { useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, ArrowUp, Check, ChevronDown, Info, Plus } from "lucide-react"

/* ----------------------------- Data ----------------------------- */

const MODELS = [
  { name: "Auto", tag: "Suggested" },
  { name: "Claude Haiku 5.5" },
  { name: "GPT-5.6 Sol" },
  { name: "Gemini 3.1 Pro" },
  { name: "Grok 4.5" },
  { name: "Deepseek V3.2" },
]

const QUERY = "What's the Market Condition?"

const STEPS = [
  { active: "Thinking", done: "Thought", detail: "Choosed a Bitcoin" },
  { active: "Researching", done: "Researched", detail: "Bitcoin market news, x condition?" },
  { active: "Predicting", done: "Predicted", detail: "Highest chance found" },
]

const TRADE = {
  entry: 64500,
  toWin: 136430,
  roi: 36.43,
  amount: 100000,
  symbol: "BTCUSDT",
  leverage: 10,
  takeProfit: 66850,
  stopLoss: 63500,
}

const LEVERAGE_TICKS = [1, 25, 50, 75, 100, 125]

const TOOLS = [
  { name: "TradingView", dot: "bg-black", pos: "left-4 bottom-14 -rotate-[10deg]" },
  { name: "Claude", dot: "bg-orange-500", pos: "right-4 bottom-20 rotate-[10deg]" },
  { name: "Telegram", dot: "bg-cyan-500", pos: "left-14 bottom-4 -rotate-[5deg]" },
  { name: "Binance", dot: "bg-amber-400", pos: "right-5 bottom-5 rotate-[4deg]" },
]

// Animation timing (ms)
const TYPE_SPEED = 28
const STEP_GAP = 2000
const HOLD = 1400
const RESET_PAUSE = 500

const fadeBottom = {
  maskImage: "linear-gradient(to bottom, black 65%, transparent)",
  WebkitMaskImage: "linear-gradient(to bottom, black 65%, transparent)",
}

const usd = (n: number) => n.toLocaleString("en-US")

/* ------------------------- Research animation ------------------------- */

function useResearchLoop() {
  const [typed, setTyped] = useState(0)
  const [active, setActive] = useState(-1)
  const [done, setDone] = useState<number[]>([])
  const [fade, setFade] = useState(false)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms))

    const run = () => {
      setTyped(0)
      setActive(-1)
      setDone([])
      setFade(false)

      for (let i = 0; i < QUERY.length; i++) at((i + 1) * TYPE_SPEED, () => setTyped(i + 1))

      const stepsStart = QUERY.length * TYPE_SPEED + 450
      STEPS.forEach((_, i) => {
        at(stepsStart + i * STEP_GAP, () => setActive(i))
        at(stepsStart + (i + 1) * STEP_GAP - 150, () => setDone((d) => [...d, i]))
      })

      const end = stepsStart + STEPS.length * STEP_GAP + HOLD
      at(end, () => setFade(true))
      at(end + RESET_PAUSE, run)
    }

    run()
    return () => timers.forEach(clearTimeout)
  }, [])

  return { typed, active, done, fade }
}

/* --------------------------- Shared pieces --------------------------- */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-[470px] w-[86vw] shrink-0 snap-center flex-col overflow-hidden rounded-[2rem] md:w-auto border border-white/80 bg-gradient-to-b from-white to-white/70 shadow-[0_20px_50px_-20px_rgba(244,63,94,0.25)] backdrop-blur">
      {children}
    </div>
  )
}

function CardText({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-7">
      <h3 className="text-xl font-medium text-zinc-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{children}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="px-0.5 text-[9px] uppercase tracking-wider text-zinc-400">{label}</div>
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 px-2.5 text-zinc-900">{children}</div>
    </div>
  )
}

/* ------------------------------ Card 1 ------------------------------ */
/* Model selector */

function ModelSelectorUI() {
  const [selected, setSelected] = useState("Claude Haiku 5.5")

  return (
    <div className="relative px-6">
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 pb-3 pt-4 shadow-sm">
        <p className="text-sm text-zinc-400">Ask Richacle to research</p>
        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
              <Plus className="h-3.5 w-3.5" />
            </span>
            <span className="flex items-center gap-1.5 text-sm text-zinc-700">
              {selected}
              <ChevronDown className="h-3.5 w-3.5" />
            </span>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-white">
            <ArrowUp className="h-4 w-4" />
          </span>
        </div>
      </div>

      <div className="ml-16 mt-2 w-56 rounded-xl border border-zinc-200 bg-white py-1.5 shadow-xl">
        {MODELS.map((m) => (
          <button
            key={m.name}
            onClick={() => setSelected(m.name)}
            className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-sm text-zinc-800 transition-colors hover:bg-zinc-100"
          >
            <span className="flex items-center gap-2">
              {m.name}
              {m.tag && <span className="text-xs text-zinc-400">{m.tag}</span>}
            </span>
            {selected === m.name && <Check className="h-3.5 w-3.5 text-zinc-600" />}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------ Card 2 ------------------------------ */
/* Research animation */

function ResearchUI() {
  const { typed, active, done, fade } = useResearchLoop()
  const typing = typed < QUERY.length

  return (
    <div className="px-6 pt-8">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className={`w-fit max-w-full rounded-lg bg-zinc-100 px-3.5 py-2.5 text-sm text-zinc-800 transition-opacity duration-300 ${fade ? "opacity-0" : ""}`}>
          {QUERY.slice(0, typed)}
          {typing && <span className="ml-0.5 inline-block h-[14px] w-[2px] animate-pulse bg-zinc-400 align-middle" />}
        </div>

        <div className={`mt-4 flex min-h-[84px] flex-col gap-2 transition-opacity duration-300 ${fade ? "opacity-0" : ""}`}>
          {STEPS.map((step, i) => {
            const isDone = done.includes(i)
            const isActive = active === i && !isDone
            return (
              <div
                key={step.active}
                className={`flex items-center gap-2 text-sm transition-all duration-500 ease-out ${active >= i ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
              >
                <span className={`font-medium ${isDone ? "text-zinc-400" : isActive ? "animate-pulse text-zinc-900" : "text-zinc-400"}`}>
                  {isDone ? step.done : step.active}
                </span>
                {isDone && <span className="text-xs text-zinc-400">{step.detail}</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------ Card 3 ------------------------------ */
/* Predicted trade ticket */

function TradeTicketUI() {
  const { entry, toWin, roi, amount, symbol, leverage, takeProfit, stopLoss } = TRADE
  const pct = ((leverage - 1) / 124) * 100

  return (
    <div className="mx-6 space-y-2.5 rounded-2xl border border-zinc-200 bg-white p-3 text-xs shadow-sm">
      {/* Sell / Buy */}
      <div className="grid grid-cols-2 overflow-hidden rounded-lg font-bold">
        <div className="bg-zinc-100 p-2 text-left text-zinc-500">
          <span className="mb-0.5 block text-[8px] uppercase opacity-70">Sell</span>
          <div className="text-sm tracking-tighter">{usd(entry)}</div>
        </div>
        <div className="bg-blue-50 p-2 text-right text-blue-600">
          <span className="mb-0.5 block text-[8px] uppercase opacity-70">Buy</span>
          <div className="text-sm tracking-tighter">{usd(entry)}</div>
        </div>
      </div>

      {/* Amount */}
      <div>
        <div className="px-0.5 text-[9px] uppercase text-zinc-400">Amount</div>
        <div className="border-b border-zinc-200 py-2 text-right text-2xl text-zinc-900">${usd(amount)}</div>
      </div>

      {/* To win */}
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-zinc-900">To Win</span>
          <span className="text-zinc-400">
            +{roi}%
            <Info size={11} className="ml-1 inline text-zinc-300" />
          </span>
        </div>
        <span className="text-2xl text-green-600">${usd(toWin)}</span>
      </div>

      {/* Symbol / Leverage */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Symbol">
          <span className="font-medium">{symbol}</span>
        </Field>

        <div className="space-y-1.5">
          <div className="px-0.5 text-[9px] uppercase tracking-wider text-zinc-400">Leverage</div>
          <div className="flex items-center gap-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-zinc-100 text-zinc-700">−</span>
            <div className="flex-1 text-center text-base font-bold tracking-tight text-zinc-900">
              {leverage}
              <span className="text-xs font-normal">x</span>
            </div>
            <span className="flex h-6 w-6 items-center justify-center rounded bg-zinc-100 text-zinc-700">+</span>
          </div>

          <div className="relative mx-1 my-2 h-[3px] rounded-full bg-zinc-200">
            <div className="absolute left-0 top-0 h-full rounded-full bg-zinc-900" style={{ width: `${pct}%` }} />
            {LEVERAGE_TICKS.map((v) => (
              <span
                key={v}
                className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-300 bg-white"
                style={{ left: `${((v - 1) / 124) * 100}%` }}
              />
            ))}
            <span
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-zinc-900 shadow"
              style={{ left: `${pct}%` }}
            />
          </div>

          <div className="flex justify-between px-1 text-[9px] text-zinc-400">
            {LEVERAGE_TICKS.map((v) => (
              <span key={v}>{v}x</span>
            ))}
          </div>
        </div>
      </div>

      {/* TP / SL */}
      <Field label="Take profit">{usd(takeProfit)}</Field>
      <Field label="Stop loss">{usd(stopLoss)}</Field>
    </div>
  )
}

/* ------------------------- Mobile carousel ------------------------- */

function useCarousel() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  // active slide = the one whose centre is closest to the track centre
  const onScroll = () => {
    const el = trackRef.current
    if (!el) return
    const centre = el.scrollLeft + el.clientWidth / 2
    let best = 0
    let min = Infinity
    Array.from(el.children).forEach((child, i) => {
      const c = child as HTMLElement
      const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - centre)
      if (d < min) {
        min = d
        best = i
      }
    })
    setIndex(best)
  }

  const goTo = (i: number) => {
    const el = trackRef.current
    const slide = el?.children[i] as HTMLElement | undefined
    if (!el || !slide) return
    el.scrollTo({ left: slide.offsetLeft - (el.clientWidth - slide.offsetWidth) / 2, behavior: "smooth" })
  }

  return { trackRef, index, onScroll, goTo }
}

function CarouselControls({ count, index, goTo }: { count: number; index: number; goTo: (i: number) => void }) {
  const arrow = "flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200/70 text-zinc-800 transition-opacity disabled:opacity-40"

  return (
    <div className="mt-6 flex items-center justify-center gap-3 md:hidden">
      <button aria-label="Previous" disabled={index === 0} onClick={() => goTo(index - 1)} className={arrow}>
        <ArrowLeft className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2 rounded-full bg-white/70 px-4 py-3">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            aria-label={`Go to card ${i + 1}`}
            onClick={() => goTo(i)}
            className={`h-2.5 rounded-full transition-all duration-300 ${i === index ? "w-9 bg-zinc-900" : "w-2.5 bg-zinc-300"}`}
          />
        ))}
      </div>

      <button aria-label="Next" disabled={index === count - 1} onClick={() => goTo(index + 1)} className={arrow}>
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

/* ----------------------------- Section ----------------------------- */

export default function TradingSolution() {
  const { trackRef, index, onScroll, goTo } = useCarousel()

  return (
    <section className="relative overflow-hidden bg-[#f1f6f5] px-5 py-20 text-zinc-900">
      {/* pink glow behind the headline */}
      <div className="pointer-events-none absolute left-1/2 top-10 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-rose-400/30 blur-[110px]" />

      {/* Headline */}
      <div className="relative mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold leading-tight tracking-tight md:text-5xl">
          Your <span className="theseason bg-gradient-to-r from-rose-900 to-rose-600 bg-clip-text text-transparent">Prediction</span>
          <br />
          Don&apos;t Get the Returns You Deserve.
        </h2>
        <p className="mt-6 text-sm text-zinc-500 md:text-lg">
          Fix your researching flops instantly
          <br />
          <span className="text-zinc-800">
            Stop guessing. Get real time data clarity research on what&apos;s killing your ROI.
          </span>
        </p>
      </div>

      {/* Cards */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="relative -mx-5 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[7vw] py-6 [scrollbar-width:none] md:mx-auto md:mt-14 md:grid md:max-w-6xl md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:py-0 [&::-webkit-scrollbar]:hidden"
      >
        {/* 1 — Models */}
        <Card>
          <div className="pt-7">
            <CardText title="Best Model for Every Market.">
              Choose between Claude, GPT, Gemini, Grok &amp; Deepseek in one place.{" "}
              <span className="text-zinc-700">Pick the model that fits the trade.. no more tab switching.</span>
            </CardText>
          </div>
          <div className="mt-auto h-[270px] overflow-hidden" style={fadeBottom}>
            <ModelSelectorUI />
          </div>
        </Card>

        {/* 2 — Research */}
        <Card>
          <ResearchUI />
          <div className="mt-auto pb-7">
            <CardText title="See What's Moving the Market.">
              Richacle reads news, socials &amp; price action in real time{" "}
              <span className="text-zinc-700">&amp; shows you exactly why a coin is moving.. not guesses.</span>
            </CardText>
          </div>
        </Card>

        {/* 3 — Setup */}
        <Card>
          <div className="pt-7">
            <CardText title="One-Click Trade Setup.">
              Oracle sets your entry, take profit, stop loss &amp; leverage.{" "}
              <span className="text-zinc-700">Review it &amp; accept with 1 simple click.</span>
            </CardText>
          </div>
          <div className="mt-6 h-[270px] overflow-hidden" style={fadeBottom}>
            <TradeTicketUI />
          </div>

          {TOOLS.map((t) => (
            <span
              key={t.name}
              className={`absolute ${t.pos} flex items-center gap-2 rounded-full border border-white bg-white/90 px-3.5 py-1.5 text-sm font-medium text-zinc-800 shadow-lg`}
            >
              <span className={`h-3 w-3 rounded-full ${t.dot}`} />
              {t.name}
            </span>
          ))}
        </Card>
      </div>

      <CarouselControls count={3} index={index} goTo={goTo} />
    </section>
  )
}