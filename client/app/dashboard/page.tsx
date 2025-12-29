"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Plus, 
  ArrowUpRight, 
  ShieldCheck, 
  Settings2, 
  Info, 
  ChevronLeft, 
  ChevronRight,
  Power,
  Loader2,
  XCircle,
  X
} from "lucide-react"
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useRouter } from "next/navigation";


// --- Components ---

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-6 ${className}`}>
    {children}
  </div>
)

const Toggle = ({ label, status, onToggle }: { label: string, status: boolean, onToggle: () => void }) => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center gap-2">
      <div className={`h-1.5 w-1.5 rounded-full ${status ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-zinc-600'}`} />
      <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">{label}</span>
      <Info size={12} className="text-zinc-600 cursor-help" />
    </div>
    <div className="flex items-center gap-3">
      <span className={`text-xs font-medium ${!status ? 'text-zinc-100' : 'text-zinc-500'}`}>Off</span>
      <button 
        onClick={onToggle}
        className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${status ? 'bg-zinc-100' : 'bg-zinc-800'}`}
      >
        <motion.div 
          animate={{ x: status ? 22 : 4 }}
          className={`absolute top-1 w-4 h-4 rounded-full ${status ? 'bg-zinc-950' : 'bg-zinc-400'}`}
        />
      </button>
      <span className={`text-xs font-medium ${status ? 'text-zinc-100' : 'text-zinc-500'}`}>On</span>
    </div>
  </div>
)

interface Strategy {
  id: string;
  name: string;
  status: string;
  input?: string;
  last_error?: string;
  live_pnl?: number | string;
  paper_pnl?: number | string;
}

// --- Main Page ---

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [terminal, setTerminal] = useState(false)
  const [engine, setEngine] = useState(false)
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")
  const [email, setEmail] = useState("")
  const [totalPnl, setTotalPnl] = useState(0)
  const [strategiesPerf, setStrategiesPerf] = useState(0)
  const [mode, setMode] = useState<string | null>(null)
  const [strategies, setStrategies] = useState<Strategy[]>([]);

  const router = useRouter();

const pnlColor =
  totalPnl === 0
    ? "text-white"
    : totalPnl > 0
    ? "text-green-500"
    : "text-red-500"

const perfColor =
  strategiesPerf === 0
    ? "text-white"
    : strategiesPerf > 0
    ? "text-green-500"
    : "text-red-500"


useEffect(() => {
  if (!email) return;
  const fetchStrategies = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/user/${email}`);
      const data = await res.json();

      setTerminal(data?.terminal);
       setEngine(data?.engine);
      setStrategies(data?.strategies);
       setApiKey(data?.binance?.apiKey);
      setApiSecret(data?.binance?.apiSecret);
    } catch {
      toast.error("Failed loading strategies!");
    }
  };
  fetchStrategies();
  const interval = setInterval(fetchStrategies, 10000); // Poll every 10s
  return () => clearInterval(interval);
}, [email]);

useEffect(() => {
  if (!strategies || strategies.length === 0) return;

  let total = 0;
  let runningPerf = 0;

  strategies.forEach(s => {
    const live = Number(s.live_pnl || 0)
    const paper = Number(s.paper_pnl || 0)

    const sTotal = live + paper
    total += sTotal

    if (s.status === "running") {
      runningPerf += sTotal
    }
  });

  setTotalPnl(total)
  setStrategiesPerf(runningPerf)
}, [strategies]);



    useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email || "";
      setEmail(userEmail);
    };
    getUser();
  }, []);
  
  const toggleTerminal = async () => {
  if (!email) return;
  const next = !terminal;

  const form = new FormData();
  form.append("email", email);
  form.append("toggle", String(next));

  try {
    const res = await fetch("http://127.0.0.1:8000/api/terminal", {
      method: "POST",
      body: form,
    });

    if (res.status === 403) {
      toast.error("Add Binance keys before enabling terminal!");
      return;
    }

  setTerminal(next);
 
  if (!next) setEngine(false);
 
  } catch {
    toast.error("Error toggling terminal!");
  }
};

const toggleEngine = async () => {
  if (!email) return;
  const next = !engine;

  const form = new FormData();
  form.append("email", email);
  form.append("toggle", String(next));

  try {
    const res = await fetch("http://127.0.0.1:8000/api/engine", {
      method: "POST",
      body: form,
    });

    if (res.status === 403) {
      toast.error("Terminal must be ON before engine");
      return;
    }

setEngine(next);

  } catch {
    toast.error("Error toggling engine");
  }
};
 

const handleStop = async (id: string) => {
  if (!email) return; 
  try {
    const form = new FormData();
    form.append("email", email);
    form.append("strategyId", id);

    const res = await fetch(`http://127.0.0.1:8000/api/stop`, {
      method: "POST",
      body: form,
    });

    console.log("res", res)
    const data = res.json()
    console.log("data", data)

    if (res.ok) {
      toast.success("Algo Stopped!");
      setStrategies(prev => prev.map(s => s.id === id ? { ...s, status: "stopped" } : s));
    }
  } catch {
    toast.error("Error stopping");
  }
};

const handleSquareOFF = async (id: string) => {
  if (!email) return; 
  try {
    const form = new FormData();
    form.append("email", email);
    form.append("strategyId", id);

    const res = await fetch(`http://127.0.0.1:8000/api/squareoff`, {
      method: "POST",
      body: form,
    });

    console.log("res", res)
    const data = res.json()
    console.log("data", data)

    if (res.ok) {
      toast.success("Algo Square OFF!");
      setStrategies(prev => prev.map(s => s.id === id ? { ...s, status: "stopped" } : s));
    }
  } catch {
    toast.error("Error Square OFF");
  }
};


  
  const handleBinance = async () => {
    if (!email){
      toast.error("Not authenticated");
      return;
    }

    if (!apiKey || !apiSecret){
      toast.error("Missing Something");
      return;
    }

    try {
      setLoading(true);
      const form = new FormData();
      form.append("email", email);
      form.append("apiKey", apiKey);
      form.append("apiSecret", apiSecret);

      const res = await fetch("http://127.0.0.1:8000/api/binance", {
        method: "POST",
        body: form,
      });

      if(res.ok){
        toast.success("Binance Connected")
        setIsModalOpen(false)
      }
    } catch (e) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async (id: string, mode: string) => {
    if (!email){
      toast.error("Not Authenticated");
      return;
    }

    try {
      const form = new FormData();
      form.append("email", email);
      form.append("strategyId", id);
      form.append("mode", mode);

      const res = await fetch("http://127.0.0.1:8000/api/deploy", {
        method: "POST",
        body: form,
      });

      const data = await res.json()

      if (res.status === 403 && data.detail.includes("FREE plan")) {
        toast.error("Deployment not allowed on FREE plan. Please upgrade!");
        router.push("/pricing");
        return;
      }

      if (res.status === 403 && data.detail.includes("Engine is OFF")) {
        toast.error("Engine is OFF!");
        router.push("/dashboard");
        return;
      }

      if (res.status === 403 && data.detail.includes("Limit reached.")) {
        toast.error("Limit reached!");
        return;
      }

      if (res.status === 403 && data.detail.includes("Binance")) {
        toast.error("Binance API keys missing!.");
        router.push("/dashboard");
        return;
      }

      toast.success(`Algo deployed: ${mode}`)
      setStrategies(prev => prev.map(s => s.id === id ? { ...s, status: "running" } : s));
      setMode(null);
    } catch (e) {
      toast.error("Something went wrong");
      console.log(e)
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-4 md:p-10 font-sans selection:bg-zinc-500/30">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Section (Based on Image Ref) */}
        <Card className="relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-4xl font-light tracking-tight">Hello <span className="font-semibold text-white">{email.split("@")[0]}</span></h1>
                <div className="mt-8 flex items-center gap-4">
                  <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-full px-4 py-2 text-sm group-hover:border-zinc-700 transition-colors cursor-pointer">
                    <ChevronLeft size={14} className="text-zinc-500" />
                    <div className="flex items-center gap-2 px-2">
                      <div className="w-5 h-5 bg-zinc-100 rounded-sm flex items-center justify-center text-[10px] text-black font-bold">B</div>
                      <span className="font-medium">Binance</span>
                    </div>
                    <ChevronRight size={14} className="text-zinc-500" />
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    <Plus size={14} /> Add Brokerage
                  </button>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] mb-1">Total P&L</p>
                <h2 className={`text-5xl tracking-tighter ${pnlColor}`}>
  $
  {new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalPnl)}
</h2>

              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-zinc-800/50 grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Market Type</p>
                <p className="text-lg font-medium">Crypto</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Strategies Perf.</p>
                <p className={`text-lg font-medium ${perfColor}`}>
                $
  {new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(strategiesPerf)}
                </p>
              </div>
              <Toggle label="Terminal" status={terminal} onToggle={toggleTerminal} />
              <Toggle label="Trading Engine" status={engine} onToggle={() => {
    if (!terminal) {
      toast.error("Enable Terminal First");
      return;
    }
    toggleEngine();
  }} />
            </div>
          </div>
        </Card>

      {/* Strategies List - Perfectly aligned with max-w-6xl */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-6 px-1">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500">
              Active Algorithms
            </h3>
            <div className="h-[1px] flex-grow mx-4 bg-zinc-800/50" /> {/* Subtle divider line */}
          </div>

          <div className="space-y-3">
            {strategies?.filter((s) => s.status && s.status.trim() !== "").length === 0 ? (
              <div className="bg-zinc-900/20 border border-zinc-800/40 rounded-2xl py-12 text-center">
                <p className="text-zinc-600 text-sm font-light">No active execution threads</p>
              </div>
            ) : (
              strategies
                ?.filter((s) => s.status && s.status.trim() !== "")
                .map((s) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group flex flex-col md:flex-row md:items-center justify-between bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-500/30 rounded-3xl p-4 transition-all duration-300"
                  >
                    {/* Left: Info */}
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1">
                        <h4 className="text-sm font-medium text-zinc-100">{s.name}</h4>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5 uppercase tracking-tighter opacity-70">
                          {s.input || "Standard_Config"}
                        </p>
                          {/* Row 2: Error Message (Only shows if status is error) */}
  {s.status === "error" && s.last_error && (
    <motion.div 
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1.5 text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-lg"
    >
      <Info size={10} />
      <span className="text-xs">
        {s.last_error}
      </span>
    </motion.div>
  )}
                      </div>
                    </div>

                    {/* Right: Status & Action */}
                    <div className="flex items-center justify-between md:justify-end gap-6 mt-4 md:mt-0">
                      <div className="flex items-center gap-2 px-3 py-1 bg-zinc-950/50 rounded-full">
                        <div className={`h-1.5 w-1.5 rounded-full ${
                          s.status === "running" 
                          ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" 
                          :"bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                        }`} />
                        <span className="text-[9px] uppercase tracking-[0.15em] font-bold text-zinc-500">
                          {s.status}
                        </span>
                      </div>


                      <div className="flex flex-col items-end gap-2">
  {/* Row 1: Action Buttons */}
  <div className="flex gap-2">
    {s.status === "running" || s.status === "error" ? (
      <>
        <button
          onClick={() => handleStop(s.id)}
          className="bg-zinc-100 flex items-center gap-1.5 hover:bg-white text-zinc-950 px-4 py-2 rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
        >
          <Power size={12} />
          STOP
        </button>
        <button
          onClick={() => handleSquareOFF(s.id)}
          className="bg-zinc-100 flex items-center gap-1.5 hover:bg-white text-zinc-950 px-4 py-2 rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
        >
          <XCircle size={12} />
          SQUARE OFF
        </button>
      </>
    ) : mode !== s.id ? (
      <button
        onClick={() => setMode(s.id)}
        className="bg-zinc-100 hover:bg-white text-zinc-950 px-6 py-2 rounded-xl text-[10px] font-bold transition-all active:scale-95"
      >
        DEPLOY
      </button>
    ) : (
      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
        <button
          onClick={() => {
            handleDeploy(s.id, "PAPER");
          }}
          className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
        >
          PAPER
        </button>
        <button
          onClick={() => {
            handleDeploy(s.id, "LIVE");
          }}
          className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
        >
          LIVE
        </button>
        <button onClick={() => setMode(null)} className="p-1 text-zinc-500 hover:text-white">
          <X size={14} />
        </button>
      </div>
    )}
  </div>


</div>

                    </div>
                  </motion.div>
                ))
            )}
          </div>
        </div>

       </div>

      {/* Binance Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Binance API</h2>
                  <p className="text-sm text-zinc-500">Securely connect your exchange</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 ml-1">API Key</label>
                  <input 
                    type="text" 
                    value={apiKey}
                  onChange={(e)=> setApiKey(e.target.value)}
                    placeholder="Enter your API Key"
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-100 transition-colors placeholder:text-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 ml-1">Secret Key</label>
                  <input 
                    value={apiSecret}
                  onChange={(e)=> setApiSecret(e.target.value)}
                    type="password" 
                    placeholder="Enter your API Secret"
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-100 transition-colors placeholder:text-zinc-700"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                  onClick={handleBinance}
                  disabled={loading}
                    className="flex-1 flex items-center justify-center bg-zinc-100 text-zinc-950 px-4 py-3 rounded-xl text-sm font-semibold hover:bg-white transition-all active:scale-95"
                  >
                    
                    {loading ? <Loader2 size={16} className="animate-spin" /> : "Connect"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}