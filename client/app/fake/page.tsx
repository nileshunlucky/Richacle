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
  X,
  ChevronUp,
  Copy
} from "lucide-react"
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {Switch} from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


const Toggle = ({ label, status, onToggle }: { label: string, status: boolean, onToggle: () => void }) => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center gap-2">
      <div className={`h-1.5 w-1.5 rounded-full ${status ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-zinc-600'}`} />
      <span className="text-[11px] uppercase tracking-wider  font-medium">{label}</span>
      <Info size={12} className="text-white cursor-help" />
    </div>
    <div className="flex items-center gap-3">
      <span className={`text-xs font-medium ${!status ? 'text-white' : 'text-zinc-300'}`}>Off</span>
      <button 
     
        className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${status ? 'bg-zinc-100' : 'bg-zinc-800'}`}
      >
        <motion.div 
          animate={{ x: status ? 22 : 4 }}
          className={`absolute top-1 w-4 h-4 rounded-full ${status ? 'bg-zinc-950' : 'bg-zinc-400'}`}
        />
      </button>
      <span className={`text-xs font-medium ${status ? 'text-white' : 'text-zinc-300'}`}>On</span>
    </div>
  </div>
)



export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [terminal, setTerminal] = useState(false)
  const [engine, setEngine] = useState(false)
  const [loading, setLoading] = useState(false)
  const [algoLoading, setAlgoLoading] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")
  const [email, setEmail] = useState("")
  const [totalPnl, setTotalPnl] = useState(0)
  const [strategiesPerf, setStrategiesPerf] = useState(0)
  const [showLosses, setShowLosses] = useState<string | null>(null);

  const [liveTotal, setLiveTotal] = useState(100500.50);
const [livePnl, setLivePnl] = useState(10250.75);

useEffect(() => {
  const interval = setInterval(() => {
    // INCREASED VOLATILITY: Jumps between $15.00 and $125.00
    const isPositive = Math.random() > 0.48; // Slight bias
    const change = (Math.random() * 110 + 15) * (isPositive ? 1 : -1);
    
    setLiveTotal(prev => {
      const next = prev + change;
      
      // Stay within $100,000 - $110,304
      if (next < 100000) return 100000 + Math.random() * 100;
      if (next > 110304) return 110304 - Math.random() * 100;
      return next;
    });

    // PNL moves in sync with the total balance (80% correlation)
    setLivePnl(prev => prev + (change * 0.8));

  }, 100); // 100ms = 10 updates per second (HFT speed)

  return () => clearInterval(interval);
}, []);

  const router = useRouter();

 


  const renderStrategyCard = () => {
    

    return(
  <motion.div
  
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`group flex flex-col md:flex-row md:items-center justify-between bg-black border rounded-3xl p-3 transition-all duration-300 relative shrink-0 snap-center w-full
       hover:border-zinc-500/30`}
  >
  
  
    {/* Left: Info */}
                    <div className="flex items-center w-full gap-4 z-50">
                      <div className="flex flex-col gap-1 w-full">
                      
                        <div className="flex items-center justify-between w-full gap-3">                       
                        <div className="flex gap-3 items-center">
                        <img className="h-12 w-12 rounded-full" src="https://api.elbstream.com/logos/crypto/BTC" />
 <h4 className="text-sm font-medium text-zinc-100">BTC/USDT</h4>
                       
                        </div>
                      
                        <div className="flex flex-col  items-center">
                        <h4 className="text-sm font-medium text-zinc-100">$1000</h4>
                     
                        </div>
                        </div>
                        
                    
                          {/* Row 2: Error Message (Only shows if status is error) */}
  
                      </div>
                    </div>

                    {/* 2. Loss Trigger Button */}
                    
                    
        

                    

               

                    {/* Right: Status & Action */}
                    <div className="flex items-center justify-between md:justify-end gap-6 mt-4 w-full md:mt-0 z-50">
                      
 <h4 className="text-sm font-medium text-zinc-100">Aladdin</h4>

                      <div className="flex flex-col items-end gap-2">
  {/* Row 1: Action Buttons */}
  <div className="flex gap-2">
    <button
      className="bg-zinc-100 flex items-center gap-1.5 hover:bg-white text-zinc-950 px-4 py-2 rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
      disabled={algoLoading}
    >
      <Power size={12} />
              
STOP
    </button>
    <button
      className="bg-zinc-100 flex items-center gap-1.5 hover:bg-white text-zinc-950 px-4 py-2 rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
      disabled={algoLoading}
    >
      <XCircle size={12} />
      SQUARE OFF
             

    </button>
  </div>


</div>

                    </div>
             
        
    
  
  </motion.div>
  );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-4 pt-12 md:p-10 font-sans selection:bg-zinc-500/30 relative z-50">
    {/* Primary Full-Width Purple Wash */}
<div 
  className="absolute top-0 left-0 w-full h-[350px] pointer-events-none z-0"
  style={{
    background: 'linear-gradient(180deg, rgba(147, 51, 234, 0.4) 0%, rgba(107, 33, 168, 0.15) 50%, transparent 100%)',
  }}
/>

{/* High-Intensity Top Edge - This adds the "Bright" pop */}
<div 
  className="absolute top-0 left-0 w-full h-[2px] bg-purple-500 shadow-[0px_0px_100px_40px_rgba(168,85,247,0.6)] pointer-events-none z-0"
/>

{/* Soft Ambient Spread - Extra blur to prevent harsh lines */}
<div 
  className="absolute top-[-100px] left-0 w-full h-[400px] bg-purple-600/20 blur-[120px] pointer-events-none z-0"
/>
  
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Section (Based on Image Ref) */}
        <div className={`relative overflow-hidden group rounded-xl p-5 `}>
        
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center justify-between w-full">
                <h1 className="md:text-4xl ">richacle</h1>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 text-xs text-zinc-200 hover:text-white transition-colors"
                  >
                    <Plus size={14} />Broker
                  </button>
                </div>
              </div>

              <div className=" w-full flex items-center justify-center">
               
               <h2 className={`text-5xl tracking-tighter`}>
  $
  {new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(liveTotal)}
</h2>



              </div>

             <p className={`text-lg text-center w-full font-medium text-green-500`}>
  $
  {new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(livePnl)}
</p>
            </div>

            <div className="mt-12 pt-8  grid grid-cols-2 md:grid-cols-4 ">
              
              <Toggle label="Terminal" status={true} onToggle={() => {
    if (!terminal) {
      toast.error("Add Binance API Key or Secret");
      return;
    }
  }}/>
              <Toggle label="Trading Engine" status={true} onToggle={() => {
    if (!terminal) {
      toast.error("Enable Terminal First");
      return;
    }
    toggleEngine();
  }} />
            </div>
          </div>
        </div>

      {/* Strategies List - Perfectly aligned with max-w-6xl */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-6 px-1">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-100 z-50">
              Active Algorithms
            </h3>
            <div className="h-[1px] flex-grow mx-4 bg-zinc-800/50" /> {/* Subtle divider line */}
          </div>

          <div className="flex flex-col gap-2">
   <motion.div
 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`group flex flex-col md:flex-row md:items-center justify-between bg-black border rounded-3xl p-3 transition-all duration-300 relative shrink-0 snap-center w-full
       hover:border-zinc-500/30`}
  >
  
  
    {/* Left: Info */}
                    <div className="flex items-center w-full gap-4 z-50">
                      <div className="flex flex-col gap-1 w-full">
                      
                        <div className="flex items-center justify-between w-full gap-3">                       
                        <div className="flex gap-3 items-center">
                        <img className="h-12 w-12 rounded-full" src="https://api.elbstream.com/logos/crypto/BTC" />
 <h4 className="text-sm font-medium text-zinc-100">BTC/USDT</h4>
                       
                        </div>
                      
                        <div className="flex flex-col  items-center">
                        <h4 className="text-sm font-medium text-zinc-100">$10,000</h4>
                       <p className={`text-sm text-centerfont-medium text-green-500`}>
  $
  {new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(livePnl * 0.7)}
</p>
                        </div>
                        </div>
                        
                    
                          {/* Row 2: Error Message (Only shows if status is error) */}
  
                      </div>
                    </div>

                    {/* 2. Loss Trigger Button */}
                    
                    
        

                    

               

                    {/* Right: Status & Action */}
                    <div className="flex items-center justify-between md:justify-end gap-6 mt-4 w-full md:mt-0 z-50">
                      
 <h4 className="text-sm font-medium text-zinc-100">Aladdin</h4>

                      <div className="flex flex-col items-end gap-2">
  {/* Row 1: Action Buttons */}
  <div className="flex gap-2">
    <button
      className="bg-zinc-100 flex items-center gap-1.5 hover:bg-white text-zinc-950 px-4 py-2 rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
      disabled={algoLoading}
    >
      <Power size={12} />
              
STOP
    </button>
    <button
      className="bg-zinc-100 flex items-center gap-1.5 hover:bg-white text-zinc-950 px-4 py-2 rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
      disabled={algoLoading}
    >
      <XCircle size={12} />
      SQUARE OFF
             

    </button>
  </div>


</div>

                    </div>
             
        
                   
    
  
  </motion.div>
   <motion.div
 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`group flex flex-col md:flex-row md:items-center justify-between bg-black border rounded-3xl p-3 transition-all duration-300 relative shrink-0 snap-center w-full
       hover:border-zinc-500/30`}
  >
  
  
    {/* Left: Info */}
                    <div className="flex items-center w-full gap-4 z-50">
                      <div className="flex flex-col gap-1 w-full">
                      
                        <div className="flex items-center justify-between w-full gap-3">                       
                        <div className="flex gap-3 items-center">
                        <img className="h-12 w-12 rounded-full" src="https://api.elbstream.com/logos/crypto/SOL" />
 <h4 className="text-sm font-medium text-zinc-100">SOL/USDT</h4>
                       
                        </div>
                      
                        <div className="flex flex-col  items-center">
                        <h4 className="text-sm font-medium text-zinc-100">$5000</h4>
                       <p className={`text-sm text-centerfont-medium text-green-500`}>
  $
  {new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(livePnl * 0.3)}
</p>
                        </div>
                        </div>
                        
                    
                          {/* Row 2: Error Message (Only shows if status is error) */}
  
                      </div>
                    </div>

                    {/* 2. Loss Trigger Button */}
                    
                    
        

                    

               

                    {/* Right: Status & Action */}
                    <div className="flex items-center justify-between md:justify-end gap-6 mt-4 w-full md:mt-0 z-50">
                      
 <h4 className="text-sm font-medium text-zinc-100">BlackBerg</h4>

                      <div className="flex flex-col items-end gap-2">
  {/* Row 1: Action Buttons */}
  <div className="flex gap-2">
    <button
      className="bg-zinc-100 flex items-center gap-1.5 hover:bg-white text-zinc-950 px-4 py-2 rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
      disabled={algoLoading}
    >
      <Power size={12} />
              
STOP
    </button>
    <button
      className="bg-zinc-100 flex items-center gap-1.5 hover:bg-white text-zinc-950 px-4 py-2 rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
      disabled={algoLoading}
    >
      <XCircle size={12} />
      SQUARE OFF
             

    </button>
  </div>


</div>

                    </div>
             
        
                   
    
  
  </motion.div>
</div>

              
          </div>
        </div>


    
      
    </div>
  )
}
