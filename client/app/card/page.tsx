"use client";

import React, { useState, useRef } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  YAxis,
} from "recharts";
import { Input } from "@/components/ui/input";

/**
 * TradingSignalCard — Apple-style redesign
 * ------------------------------------------
 * Same data model, state, and behavior as before. Restyled around
 * an iOS/macOS dark-mode design language:
 *   - tinted (not solid) accent fills, the way iOS 17 buttons and
 *     segmented controls are tinted rather than flat-filled
 *   - SF-style type scale: tight tracking on large numerals,
 *     restrained secondary/tertiary label opacities
 *   - hairline separators instead of boxed sections
 *   - a quiet top sheen for depth instead of a hard flat black
 *
 * Runtime-only values that can't be Tailwind classes stay as
 * inline `style` (marker vertical position, uploaded avatar image),
 * same as the previous version.
 */

interface TradingSignalData {
  winRate: number;
  name: string;
  expiry: string;
  series: number[];
}

interface MarkerData {
  key: "tp" | "cur" | "sl";
  price: string;
  setPrice: (price: string) => void;
  topPct?: number;
}

interface SparklineProps {
  series: number[];
  markers: MarkerData[];
  direction: "long" | "short";
}

interface PriceMarkerProps {
  topPct: number;
  variant: "tp" | "cur" | "sl";
  price: string;
  setPrice: (price: string) => void;
}

const DEFAULT_DATA: TradingSignalData = {
  winRate: 79,
  name: "Claude Fable 5",
  expiry: "EXP 25 JUL 2026",
  series: [
    37, 36, 34, 33, 38, 41, 40, 38, 31, 30, 33, 41, 42, 40, 45, 58, 47, 45, 49, 52, 55, 58, 62, 68, 70,
    69, 65, 68, 66, 74, 72, 76, 68, 49,
  ],
};

const ACCENT = {
  long: { solid: "#30D158", tint: "rgba(48,209,88,0.16)", ring: "rgba(48,209,88,0.35)" },
  short: { solid: "#FF453A", tint: "rgba(255,69,58,0.16)", ring: "rgba(255,69,58,0.35)" },
};

const ghostInput =
  "!bg-transparent !border-none !outline-none !ring-0 !shadow-none p-0 h-auto";

function Sparkline({ series, markers, direction }: SparklineProps) {
  const chartData = series.map((v, i) => ({ i, v }));
  const last = series[series.length - 1];
  const min = Math.min(...series);
  const max = Math.max(...series);
  const CHART_RIGHT_MARGIN = 92; // reserved space so TP/SL boxes sit past the line's end
  const accent = ACCENT[direction];

  // exact pixel position of the chart's last point, reused so the
  // "current price" line lands precisely on the end of the chart line
  const lastPointPx = 18 + (1 - (last - min) / (max - min)) * (220 - 36);
  const lastPointPct = (lastPointPx / 220) * 100;

  // long: TP above / SL below. short: flipped — SL above / TP below.
  const tpPct =
    direction === "long"
      ? Math.max(6, lastPointPct - 24)
      : Math.min(94, lastPointPct + 24);
  const slPct =
    direction === "long"
      ? Math.min(94, lastPointPct + 24)
      : Math.max(6, lastPointPct - 24);

  const positionedMarkers = markers.map((m) =>
    m.key === "cur"
      ? { ...m, topPct: lastPointPct }
      : m.key === "tp"
      ? { ...m, topPct: tpPct }
      : { ...m, topPct: slPct }
  );

  return (
    <div className="relative w-full h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: CHART_RIGHT_MARGIN, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="signalFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent.solid} stopOpacity={0.28} />
              <stop offset="100%" stopColor={accent.solid} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
          <Area
            type="monotone"
            dataKey="v"
            stroke={accent.solid}
            strokeWidth={2}
            fill="url(#signalFill)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* pulsing live dot pinned to the last value */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ right: CHART_RIGHT_MARGIN, top: `${lastPointPx}px`, transform: "translate(90%, 10%)" }}
      >
        <span
          className="absolute -inset-2 rounded-full animate-[signalPulse_1.8s_ease-out_infinite]"
          style={{ backgroundColor: accent.tint }}
        />
        <span className="block w-[7px] h-[7px] rounded-full ring-2 ring-black/40" style={{ backgroundColor: accent.solid }} />
      </div>

      {/* TP / current / SL price lines, continuing past the chart's end */}
      {positionedMarkers.map(({ key, topPct, ...rest }) => (
        <PriceMarker key={key} variant={key} topPct={topPct as number} {...rest} />
      ))}
    </div>
  );
}

function PriceMarker({ topPct, variant, price, setPrice }: PriceMarkerProps) {
  const style =
    variant === "tp"
      ? { line: "rgba(48,209,88,0.45)", bg: ACCENT.long.tint, text: "#30D158", ring: ACCENT.long.ring }
      : variant === "sl"
      ? { line: "rgba(255,69,58,0.45)", bg: ACCENT.short.tint, text: "#FF453A", ring: ACCENT.short.ring }
      : { line: "rgba(255,255,255,0.18)", bg: "#FFFFFF", text: "#000000", ring: "transparent" };

  return (
    <div className="absolute left-0 right-0" style={{ top: `${topPct}%` }}>
      <div
        className="absolute left-0 right-0 -translate-y-1/2 border-t border-dashed"
        style={{ borderColor: style.line }}
      />
      <div
        className="absolute right-0 -translate-y-1/2 flex items-center rounded-full px-2.5 py-[3px] whitespace-nowrap backdrop-blur-sm"
        style={{ backgroundColor: style.bg, boxShadow: `inset 0 0 0 1px ${style.ring}` }}
      >
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className={`${ghostInput} w-[58px] text-[11px] font-semibold tabular-nums text-center tracking-tight`}
          style={{ color: style.text }}
        />
      </div>
    </div>
  );
}

export default function TradingSignalCard({ data = DEFAULT_DATA }: { data?: TradingSignalData }) {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [heading, setHeading] = useState("Untitled signal");
  const [winRate, setWinRate] = useState(String(data.winRate));
  const [name, setName] = useState(data.name);
  const [expiry, setExpiry] = useState(data.expiry);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tpPrice, setTpPrice] = useState("65,800");
  const [curPrice, setCurPrice] = useState("65,800");
  const [slPrice, setSlPrice] = useState("65,800");
  const [direction, setDirection] = useState<"long" | "short">("long");

  const markers: MarkerData[] = [
    { key: "tp", price: tpPrice, setPrice: setTpPrice },
    { key: "cur", price: curPrice, setPrice: setCurPrice },
    { key: "sl", price: slPrice, setPrice: setSlPrice },
  ];

  const handleAvatarClick = () => fileInputRef.current?.click();
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAvatar(URL.createObjectURL(file));
  };

  return (
    <div
      className="relative font-sans text-white w-full h-full px-6 pt-[22px] pb-[18px] overflow-hidden bg-black"
    >
      <style>{`
          @keyframes signalPulse {
            0% { transform: scale(0.6); opacity: 0.9; }
            100% { transform: scale(2.2); opacity: 0; }
          }
          .rc-avatar-btn { transition: transform 0.2s ease, opacity 0.2s ease; }
          .rc-avatar-btn:hover { transform: scale(1.05); opacity: 0.92; }
          .rc-seg-btn { transition: background-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease; }
        `}</style>

        {/* quiet top sheen for depth, Apple dark-mode style */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-24"
          style={{ background: "radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.06), rgba(255,255,255,0) 70%)" }}
        />

        {/* header: editable avatar + editable heading + long/short toggle */}
        <div className="relative flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleAvatarClick}
            aria-label="Change image"
            className={`rc-avatar-btn w-11 h-11 rounded-full border-none p-0 cursor-pointer overflow-hidden flex items-center justify-center shrink-0 bg-cover bg-center ${
              avatar ? "" : "bg-[linear-gradient(160deg,_#2c2c2e,_#0e0e0f)]"
            }`}
            style={avatar ? { backgroundImage: `url(${avatar})` } : undefined}
          >
            {!avatar && (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 16l4.6-4.6a2 2 0 0 1 2.8 0L16 16M14 14l1.6-1.6a2 2 0 0 1 2.8 0L21 15M4 8h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
              </svg>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />

          <Input
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            className={`${ghostInput} text-[15px] font-semibold tracking-[-0.01em] text-white min-w-0 flex-1`}
          />

          <div className="flex rounded-full bg-white/[0.07] ring-1 ring-white/[0.06] p-[3px] shrink-0">
            <button
              type="button"
              onClick={() => setDirection("long")}
              className="rc-seg-btn text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={
                direction === "long"
                  ? { backgroundColor: "#FFFFFF", color: "#000000", boxShadow: "none" }
                  : { color: "rgba(255,255,255,0.4)" }
              }
            >
              Long
            </button>
            <button
              type="button"
              onClick={() => setDirection("short")}
              className="rc-seg-btn text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={
                direction === "short"
                  ? { backgroundColor: "#FFFFFF", color: "#000000", boxShadow: "none" }
                  : { color: "rgba(255,255,255,0.4)" }
              }
            >
              Short
            </button>
          </div>
        </div>

        {/* big stat: Win Rate + RICHACLE branding */}
        <div className="relative flex items-center my-[18px] pb-[14px] border-b border-white/[0.06]">
          <div className="flex items-baseline">
            <Input
              value={winRate}
              onChange={(e) => setWinRate(e.target.value)}
              className={`${ghostInput} text-[32px] font-bold tracking-[-0.02em] text-white tabular-nums w-[54px]`}
            />
            <span className="text-[20px] font-semibold  -ml-1">%</span>
          <span className="text-[13px] font-medium  ml-2 pb-1.5">Win Rate</span>
          </div>

          <span className="ml-auto text-xl uppercase  theseason px-2.5 py-1">
            RICHACLE
          </span>
        </div>

        {/* chart */}
        <Sparkline series={data.series} markers={markers} direction={direction} />

        {/* footer: editable name + editable expiry text */}
        <div className="relative flex items-center justify-between mt-[14px] pt-[14px] border-t border-white/[0.06]">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${ghostInput} text-[13px] font-semibold tracking-[-0.005em] text-white/80`}
          />
          <Input
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className={`${ghostInput} text-[11px] font-medium tracking-wide text-white/35 uppercase`}
          />
        </div>
      </div>
  );
}