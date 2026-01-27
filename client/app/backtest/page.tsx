"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, 
  LineElement, Title, Tooltip, Legend, Filler 
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Loader2, ChevronRight } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface Strategy {
  id: string;
  name: string;
  input: string;
  code: string;
}



function BacktestContent() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrat, setSelectedStrat] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [equityCurve, setEquityCurve] = useState<number[]>([]);
  
  const searchParams = useSearchParams();
  const preSelectedId = searchParams.get("id");
  const router = useRouter();

  const fetchStrategies = useCallback(async (userEmail: string, autoSelectId?: string | null) => {
    try {
      const res = await fetch(`https://api.richacle.com/user/${userEmail}`);
      const data = await res.json();
      const fetchedStrategies = data.strategies || [];
      setStrategies(fetchedStrategies);

      if (autoSelectId) {
        const found = fetchedStrategies.find((s: Strategy) => s.id === autoSelectId);
        if (found) setSelectedStrat(found);
      }
    } catch (e) { console.error("Fetch error:", e); }
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        fetchStrategies(session.user.email, preSelectedId);
      }
    };
    getUser();
  }, [preSelectedId, fetchStrategies]);

  const handleBacktest = async () => {
    if (!selectedStrat) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email;
      if (!userEmail) { 
        toast.error("Not authenticated");
        return;
      }

      const res = await fetch("https://api.richacle.com/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy: selectedStrat.code, email: userEmail }),
      });  
      const data = await res.json();

      if (res.status === 403) {
          toast.error("Insufficient backtest credits, Upgrade your Plan!");
          router.push("/pricing");
          return;
      }
      

      if (data.status === "success") {
        setResult(data.metrics);
        
        // REAL DATA PROCESSING
        // Assumes data.trade_history is an array of individual P&L like [10, -5, 20]
        const history = data.trade_history || [];
        const equityPoints: number[] = [0]; // Start at zero
        let runningTotal = 0;

        history.forEach((pnl: number) => {
          runningTotal += pnl;
          equityPoints.push(Number(runningTotal.toFixed(2)));
        });

        setEquityCurve(equityPoints);
      }
    } catch (err) { 
      toast.error("Could not connect to server.");
      console.log(err)
    } finally { 
      setLoading(false); 
    }
  };

  const isPositive = (result?.total_pnl || 0) >= 0;
  const themeColor = isPositive ? "16, 185, 129" : "239, 68, 68";

  const chartData = {
    labels: equityCurve.map((_, i) => i === 0 ? "Start" : `T${i}`),
    datasets: [{
      fill: true,
      data: equityCurve,
      borderColor: isPositive ? "#10b981" : "#ef4444",
      borderWidth: 3, // Slightly thicker for premium feel
      pointRadius: 0,
      pointHoverRadius: 6,
      pointBackgroundColor: isPositive ? "#10b981" : "#ef4444",
      pointBorderColor: "#fff",
      pointBorderWidth: 2,
      // --- THE FLOW FIXES ---
      stepped: false, // Turn off square steps
      tension: 0.4,   // This creates the smooth "circle curve" flow
      // ----------------------
      backgroundColor: (context: any) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, isPositive ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)");
        gradient.addColorStop(0.6, isPositive ? "rgba(16, 185, 129, 0.05)" : "rgba(239, 68, 68, 0.05)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        return gradient;
      },
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    bezierCurve: true, // Ensures smooth pathing
    interaction: { intersect: false, mode: 'index' as const },
    plugins: { 
        legend: { display: false },
        tooltip: {
            enabled: true,
            backgroundColor: "#09090b",
            titleColor: "#71717a",
            bodyColor: "#ffffff",
            bodyFont: { size: 13, weight: 'bold' as const },
            padding: 15,
            borderColor: "#27272a",
            borderWidth: 1,
            displayColors: false,
            cornerRadius: 8,
            callbacks: {
                label: (context: any) => ` Equity: $${context.parsed.y.toLocaleString()}`
            }
        }
    },
    scales: {
      x: { 
        display: true, 
        grid: { display: false },
        ticks: { 
            color: "#3f3f46", 
            font: { size: 9 }, 
            maxRotation: 0,
            autoSkip: true, 
            maxTicksLimit: 10 
        }
      },
      y: { 
        position: 'right' as const, // Premium charts usually have Y-axis on the right
        grid: { color: "rgba(255, 255, 255, 0.05)", drawBorder: false }, 
        ticks: { 
            color: "#71717a", 
            font: { size: 10, family: "monospace" }, 
            padding: 10,
            callback: (value: any) => '$' + value
        } 
      },
    },
  };

  return (
    <div className="min-h-screen bg-black text-white p-5 md:p-12 font-sans relative ">
    {/* Instagram Full Bright Glow with Top (50%) and Bottom (10%) Black Fade */}
<div className="absolute inset-0 overflow-hidden z-0">
  
  {/* 1. The Main Vibrant Layer */}
  <div 
    className="absolute inset-0 opacity-100"
    style={{
      background: `
        radial-gradient(circle at 0% 100%, rgba(255, 220, 107, 1) 0%, rgba(253, 29, 29, 0.6) 35%, transparent 70%),
        radial-gradient(circle at 100% 100%, rgba(225, 48, 108, 0.9) 0%, rgba(131, 58, 180, 0.7) 40%, transparent 80%),
        radial-gradient(circle at 50% 50%, rgba(64, 93, 230, 0.8) 0%, transparent 100%)
      `,
      filter: 'blur(40px)'
    }}
  />

  {/* 2. The Black Top Mask (Top 50%) */}
  <div className="absolute inset-0 bg-gradient-to-b from-black via-black/60 to-transparent h-1/2" />



  {/* 4. Global Saturation Boost */}
  <div className="absolute inset-0 bg-white/9 mix-blend-overlay pointer-events-none" />

</div>
      <div className="max-w-4xl mx-auto space-y-10">
        
        <div className="space-y-3">

          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative w-full flex-1">
              <Select 
                value={selectedStrat?.id || ""} 
                onValueChange={(id) => setSelectedStrat(strategies.find(s => s.id === id) || null)}
              >
                <SelectTrigger className="w-full h-14 bg-zinc-950 border-zinc-800 rounded-xl px-5 p-7 text-sm">
                  <SelectValue placeholder="Select strategy..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 p-1.5 ">
                  {strategies.map((strat) => (
                    <SelectItem key={strat.id} value={strat.id} className="rounded-lg p-3 my-0.5 cursor-pointer">
                      <div className="flex items-center justify-between w-full min-w-[200px]">
                        <div>
                          <h3 className="text-xs font-bold uppercase">{strat.name}</h3>
                          <p className="text-[9px] opacity-50 mt-0.5 font-mono">{strat.input}</p>
                        </div>
                        <ChevronRight size={12} className="ml-4 opacity-20" />
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleBacktest}
              disabled={loading || !selectedStrat}
              className="h-14 px-10 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold text-xs uppercase disabled:opacity-20 w-full md:w-[180px] z-50"
            >
              {loading ? <Loader2 className="animate-spin size-4" /> : "Back Test"}
            </Button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {result ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 ">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 ">
                <Stat label="Net P&L" value={`$${result.total_pnl}`} color={isPositive ? "text-green-500" : "text-red-500"} />
                <Stat label="Return" value={`${result.return_percent}%`} color={isPositive ? "text-green-500" : "text-red-500"} />
                <Stat label="Drawdown" value={`${result.max_drawdown}%`} color="text-red-500" />
                <Stat label="Win Rate" value={`${result.win_rate_percent}%`} color="text-zinc-100" />
              </div>
              

              <div className="relative z-10 space-y-8 bg-black p-6 rounded-3xl border border-white/10">
                <div className="flex justify-between items-center mb-8 text-[9px] uppercase font-bold text-zinc-600 ">
                  <span>Equity Curve</span>
                  <span className="text-zinc-200 ">{result.total_trades} TRADES</span>
                </div>
                <div className="h-[250px] md:h-[350px]">
                  <Line data={chartData} options={chartOptions} />
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center ">
              <span className="uppercase theseason z-50 text-white">RICHACLE</span>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// 2. Export a default function that wraps the content in Suspense
export default function BacktestUI() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-zinc-500" />
      </div>
    }>
      <BacktestContent />
    </Suspense>
  );
}

function Stat({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="space-y-1 py-4 px-4 bg-black backdrop-blur-sm rounded-2xl border border-white/5">
      <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">{label}</p>
      <p className={`text-2xl md:text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}