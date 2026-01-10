"use client"

import React, { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  User, 
  Shield, 
  Key, 
  Cpu, 
  Terminal,
  Search,
  ChevronDown // Added for the toggle
} from "lucide-react"
import { supabase } from "@/lib/supabaseClient";

interface UserData {
  _id: string;
  email: string;
  plan: string;
  credits: number;
  copilot: number;
  backtest: number;
  engine: boolean;
  terminal: boolean;
  active: boolean;
  binance?: {
    apiKey: string;
    apiSecret: string;
  };
  strategies?: Array<{
    id: string;
    name: string;
    symbol: string;
    timeframe: string;
    mode: string;
    amount: string | number;
    leverage: string | number;
    status: string;
    live_pnl?: string;
    paper_pnl?: string;
    input: string;
  }>;
}

export default function AdminDirectory() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [email, setEmail] = useState("")
  const [authChecking, setAuthChecking] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null) // State for toggle

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email || "";
      setEmail(userEmail);
      setAuthChecking(false);
    };
    getUser();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`https://api.richacle.com/users-full`)
        const data = await res.json()
        setUsers(data)
      } catch (e) {
        console.error("API Error:", e)
      } finally {
        setLoading(false)
      }
    }
    if (email === "nileshinde001@gmail.com") {
      fetchUsers()
    }
  }, [email])

  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user._id?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery, users])

  const toggleUser = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  if (!authChecking && email !== "nileshinde001@gmail.com") {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center font-sans">
        <h1 className="text-6xl font-light tracking-tighter text-white mb-2">404</h1>
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.4em]">Not Found</p>
      </div>
    )
  }

  if (loading || authChecking) return (
    <div className="flex h-screen items-center justify-center bg-black">
      <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-12 font-sans selection:bg-white selection:text-black">
      <div className="max-w-6xl mx-auto mb-8 md:mb-16 flex items-end justify-between border-b border-white/10 pb-8">
        <div>
          <h1 className="text-2xl md:text-4xl font-semibold tracking-tight flex gap-2 items-center ">
            <span className="theseason font-light">RICHACLE</span>ADMIN
          </h1>
          <div className="relative mt-4 w-64 md:w-80 group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white/60 transition-colors" />
            <input 
              type="text"
              placeholder="Search email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs md:text-sm outline-none focus:border-white/30 transition-all"
            />
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-baseline justify-end gap-2">
            {searchQuery && (
              <p className="text-xl md:text-2xl font-light text-white/40 tracking-tighter">{filteredUsers.length} /</p>
            )}
            <p className="text-4xl md:text-6xl font-light tracking-tighter">{users.length}</p>
          </div>
          <p className="text-[9px] md:text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Total Users</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredUsers.map((user, idx) => {
            const isExpanded = expandedId === user._id;
            return (
              <motion.div
                key={user._id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ delay: idx * 0.02 }}
                className="group bg-[#0A0A0A] border border-white/10 rounded-2xl md:rounded-3xl overflow-hidden hover:border-white/30 transition-all duration-300"
              >
                {/* Clickable Header */}
                <div 
                  onClick={() => toggleUser(user._id)}
                  className="p-5 md:p-8 flex items-center justify-between gap-6 cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex gap-4 md:gap-6 items-center min-w-0">
                    <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <User size={20} className="text-white/60" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-0.5">
                        <h2 className="text-base md:text-lg font-medium tracking-tight truncate">{user.email}</h2>
                        <span className={`text-[8px] md:text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          user.plan === 'PRO' || user.plan === 'PREMIUM' ? 'bg-white text-black border-white' : 'border-white/20 text-white/40'
                        }`}>
                          {user.plan}
                        </span>
                      </div>
                      <p className="text-[9px] md:text-[10px] font-mono text-white/30 uppercase tracking-tighter truncate">{user._id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Compact View Stats (Visible when closed) */}
                    {!isExpanded && (
                      <div className="hidden sm:flex gap-6 border-r border-white/10 pr-6">
                        <StatusItem label="Credits" value={user.credits} />
                        <StatusItem label="Strats" value={user.strategies?.length || 0} />
                      </div>
                    )}
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      className="text-white/20 group-hover:text-white/60 transition-colors"
                    >
                      <ChevronDown size={20} />
                    </motion.div>
                  </div>
                </div>

                {/* Expandable Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-5 md:px-8 pb-8 border-t border-white/5 pt-6">
                        <div className="grid grid-cols-2 sm:flex md:gap-12 gap-4 mb-8">
                          <StatusItem label="Credits" value={user.credits} />
                          <StatusItem label="Copilot" value={user.copilot} />
                          <StatusItem label="Backtest" value={user.backtest} />
                          <div className="flex flex-col items-start">
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Access</p>
                            <div className="flex gap-2">
                              <AccessBadge active={user.engine} icon={<Cpu size={14}/>} />
                              <AccessBadge active={user.terminal} icon={<Terminal size={14}/>} />
                              <AccessBadge active={user.active} icon={<Shield size={14}/>} />
                            </div>
                          </div>
                        </div>

                        {user.binance && (
                          <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 flex flex-col md:flex-row gap-3 md:gap-8 md:items-center mb-6">
                            <div className="flex items-center gap-2 text-white/40">
                              <Key size={14} />
                              <span className="text-[10px] uppercase font-bold tracking-widest">Binance</span>
                            </div>
                            <div className="flex flex-col md:flex-row md:gap-6 gap-1 text-[10px] md:text-xs font-mono break-all text-white/60">
                              <p><span className="text-white/20">KEY:</span> {user.binance.apiKey}</p>
                              <p><span className="text-white/20">SEC:</span> {user.binance.apiSecret}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-3 mb-6">
                          <div className="h-[1px] flex-1 bg-white/10"></div>
                          <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Deployed Strategies ({user.strategies?.length || 0})</span>
                          <div className="h-[1px] flex-1 bg-white/10"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {user.strategies?.map((strat) => (
                            <div key={strat.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="font-medium text-sm text-white/90">{strat.name}</h4>
                                  <p className="text-[10px] text-white/30 font-mono mt-1">{strat.symbol} • {strat.timeframe}</p>
                                </div>
                                <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                                  strat.mode === 'LIVE' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                }`}>
                                  {strat.mode}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                                <SmallStat label="Amount" value={`$${strat.amount}`} />
                                <SmallStat label="Lev" value={`${strat.leverage}x`} />
                                <SmallStat label="Status" value={strat.status} />
                                <SmallStat 
                                  label="Live PNL" 
                                  value={`$${strat.live_pnl || '0'}`} 
                                  color={parseFloat(strat.live_pnl || '0') >= 0 ? 'text-green-400' : 'text-red-500'} 
                                />
                                <SmallStat 
                                  label="Paper PNL" 
                                  value={`$${strat.paper_pnl || '0'}`} 
                                  color={parseFloat(strat.paper_pnl || '0') >= 0 ? 'text-green-400' : 'text-red-500'} 
                                />
                              </div>
                              <p className="text-xs text-white/50 leading-relaxed line-clamp-2">"{strat.input}"</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

function StatusItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-left">
      <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm md:text-base font-medium tabular-nums">{value}</p>
    </div>
  )
}

function AccessBadge({ active, icon }: { active: boolean; icon: React.ReactNode }) {
  return (
    <div className={`p-2 rounded-lg border transition-colors ${
      active ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/5 text-white/10'
    }`}>
      {icon}
    </div>
  )
}

function SmallStat({ label, value, color = "text-white/70" }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-black/40 p-2 rounded-lg border border-white/5">
      <p className="text-[8px] uppercase text-white/20 font-bold tracking-tighter">{label}</p>
      <p className={`text-[11px] font-medium capitalize truncate ${color}`}>{value}</p>
    </div>
  )
}