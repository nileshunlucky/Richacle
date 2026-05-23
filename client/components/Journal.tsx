"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, TrendingUp, TrendingDown, Calendar, BarChart2, LoaderCircle } from "lucide-react";

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(" ");

interface DayData {
  date: string;       // "YYYY-MM-DD"
  pnl: number;
  trades: number;
  symbols: string[];
}

interface JournalProps {
  email: string;
  onClose: () => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function formatPnl(val: number) {
  const abs = Math.abs(val);
  const str = abs >= 1000 ? `$${(abs / 1000).toFixed(2)}K` : `$${abs.toFixed(2)}`;
  return val < 0 ? `-${str}` : `+${str}`;
}

function formatPnlFull(val: number) {
  const sign = val < 0 ? "-" : "+";
  return `${sign}$${Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Journal({ email, onClose }: JournalProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [calendarData, setCalendarData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("email", email);
      const res = await fetch("https://api.richacle.com/api/trade-history", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      console.log(json)
      setCalendarData(json.calendar || []);
      setFetched(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [email]);

  // On mount fetch immediately
  React.useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Index data by date string
  const dataByDate = React.useMemo(() => {
    const map: Record<string, DayData> = {};
    calendarData.forEach(d => { map[d.date] = d; });
    return map;
  }, [calendarData]);

  // Build calendar grid for current month
  const calendarGrid = React.useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  // Monthly stats
  const monthStats = React.useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    const days = calendarData.filter(d => d.date.startsWith(prefix));
    const netPnl = days.reduce((s, d) => s + d.pnl, 0);
    const winDays = days.filter(d => d.pnl > 0).length;
    const lossDays = days.filter(d => d.pnl < 0).length;
    const tradingDays = days.filter(d => d.trades > 0).length;
    const dayWinPct = tradingDays > 0 ? ((winDays / tradingDays) * 100).toFixed(1) : "0.0";
    const totalTrades = days.reduce((s, d) => s + d.trades, 0);
    return { netPnl, winDays, lossDays, tradingDays, dayWinPct, totalTrades };
  }, [calendarData, viewYear, viewMonth]);

  // Weekly summaries
  const weeks = React.useMemo(() => {
    const rows: (number | null)[][] = [];
    for (let i = 0; i < calendarGrid.length; i += 7) rows.push(calendarGrid.slice(i, i + 7));
    return rows.map((row, wi) => {
      let pnl = 0; let days = 0; let trades = 0;
      row.forEach(day => {
        if (!day) return;
        const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const d = dataByDate[key];
        if (d && d.trades > 0) { pnl += d.pnl; days++; trades += d.trades; }
      });
      return { week: wi + 1, pnl, days, trades };
    });
  }, [calendarGrid, dataByDate, viewYear, viewMonth]);

  const goPrev = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const goNext = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); };

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.96, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 20, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 180 }}
        className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06] sticky top-0 bg-[#0d0d0d] z-10">
          <div className="flex items-center gap-3">
            <Calendar size={18} className="text-white/40" />
            <h2 className="text-white font-semibold text-sm tracking-wide">PnL Journal</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
            <X size={16} className="text-white/60" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-24">
            <LoaderCircle size={22} className="animate-spin text-white/30" />
          </div>
        ) : (
          <div className="p-4 md:p-5 flex flex-col gap-4">

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: "Net P&L",
                  value: formatPnlFull(monthStats.netPnl),
                  color: monthStats.netPnl >= 0 ? "text-emerald-400" : "text-red-400",
                  icon: monthStats.netPnl >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>,
                },
                {
                  label: "Day win %",
                  value: `${monthStats.dayWinPct}%`,
                  color: "text-white",
                  sub: `${monthStats.winDays}W / ${monthStats.lossDays}L`,
                },
                {
                  label: "Trading days",
                  value: `${monthStats.tradingDays}`,
                  color: "text-white",
                  sub: `${monthStats.totalTrades} trades`,
                },
                {
                  label: "Best day",
                  value: (() => {
                    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
                    const days = calendarData.filter(d => d.date.startsWith(prefix) && d.pnl > 0);
                    if (!days.length) return "$0";
                    const best = Math.max(...days.map(d => d.pnl));
                    return `+$${best.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  })(),
                  color: "text-emerald-400",
                },
              ].map((s, i) => (
                <div key={i} className="bg-[#141414] border border-white/[0.05] rounded-xl p-4">
                  <div className="text-[10px] uppercase tracking-wider text-white/30 mb-2">{s.label}</div>
                  <div className={cn("text-xl font-bold tabular-nums", s.color)}>
                    {s.icon && <span className="inline mr-1">{s.icon}</span>}{s.value}
                  </div>
                  {s.sub && <div className="text-[11px] text-white/30 mt-1">{s.sub}</div>}
                </div>
              ))}
            </div>

            {/* Month Nav */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={goPrev} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
                  <ChevronLeft size={16} className="text-white/60" />
                </button>
                <h3 className="text-white font-semibold text-sm min-w-[140px] text-center">
                  {MONTHS[viewMonth]} {viewYear}
                </h3>
                <button onClick={goNext} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
                  <ChevronRight size={16} className="text-white/60" />
                </button>
                <button
                  onClick={goToday}
                  className="text-[11px] px-3 py-1 rounded-lg bg-white/[0.06] hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  This month
                </button>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-white/30">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-500/60 inline-block"/>Profit</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-red-500/60 inline-block"/>Loss</span>
              </div>
            </div>

            {/* Calendar + Weekly */}
            <div className="flex gap-3">
              {/* Calendar Grid */}
              <div className="flex-1 min-w-0">
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-1">
                  {DAYS.map(d => (
                    <div key={d} className="text-center text-[10px] uppercase tracking-wider text-white/20 py-1.5">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Weeks */}
                <div className="flex flex-col gap-1">
                  {Array.from({ length: calendarGrid.length / 7 }, (_, wi) => (
                    <div key={wi} className="grid grid-cols-7 gap-1">
                      {calendarGrid.slice(wi * 7, wi * 7 + 7).map((day, di) => {
                        if (!day) return <div key={di} className="rounded-lg h-[72px] md:h-[80px] bg-[#0a0a0a]" />;

                        const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const d = dataByDate[key];
                        const isToday = key === todayKey;
                        const hasData = d && d.trades > 0;
                        const isWin = hasData && d.pnl > 0;
                        const isLoss = hasData && d.pnl < 0;

                        return (
                          <motion.div
                            key={di}
                            whileHover={{ scale: 1.02 }}
                            className={cn(
                              "rounded-lg h-[72px] md:h-[80px] p-1.5 flex flex-col justify-between relative overflow-hidden transition-colors",
                              isWin && "bg-emerald-500/10 border border-emerald-500/20",
                              isLoss && "bg-red-500/10 border border-red-500/20",
                              !hasData && "bg-[#111] border border-white/[0.04]",
                              isToday && !hasData && "border-white/20",
                            )}
                          >
                            <span className={cn(
                              "text-[10px] font-medium self-end",
                              isWin && "text-emerald-500/60",
                              isLoss && "text-red-500/60",
                              !hasData && "text-white/20",
                              isToday && "text-white/70"
                            )}>
                              {day}
                            </span>
                            {hasData && (
                              <div className="space-y-0.5">
                                <div className={cn(
                                  "text-[11px] md:text-[12px] font-bold tabular-nums leading-none",
                                  isWin ? "text-emerald-400" : "text-red-400"
                                )}>
                                  {formatPnl(d.pnl)}
                                </div>
                                <div className="text-[9px] text-white/25">
                                  {d.trades} trade{d.trades !== 1 ? "s" : ""}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly Summary */}
              <div className="w-[90px] md:w-[110px] flex flex-col gap-1 pt-[28px]">
                {weeks.map((w) => (
                  <div
                    key={w.week}
                    className={cn(
                      "h-[72px] md:h-[80px] rounded-lg p-2 flex flex-col justify-between border",
                      w.pnl > 0 && "bg-emerald-500/5 border-emerald-500/15",
                      w.pnl < 0 && "bg-red-500/5 border-red-500/15",
                      w.pnl === 0 && "bg-[#111] border-white/[0.04]"
                    )}
                  >
                    <span className="text-[9px] uppercase tracking-wide text-white/25">Week {w.week}</span>
                    <div>
                      <div className={cn(
                        "text-[11px] font-bold tabular-nums",
                        w.pnl > 0 ? "text-emerald-400" : w.pnl < 0 ? "text-red-400" : "text-white/20"
                      )}>
                        {w.pnl !== 0 ? formatPnl(w.pnl) : "$0"}
                      </div>
                      <div className="text-[9px] text-white/20">{w.days} day{w.days !== 1 ? "s" : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}