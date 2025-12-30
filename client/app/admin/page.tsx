"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchalluserdata = async () => {
      try {
        const res = await fetch("https://api.richacle.com/users-full");
        const data = await res.json();
        setUsers(data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch:", err);
        setLoading(false);
      }
    };
    fetchalluserdata();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-[-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,Helvetica,Arial,sans-serif] selection:bg-white selection:text-black antialiased">
      {/* Navigation / Header */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img className="h-6 w-6" src="/logo.png" alt="logo"/>
            <span className="flex items-center justify-center gap-2 text-lg">
            <span className="theseason">RICHACLE</span>
             Admin</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] uppercase  text-white/40 font-bold">Total Users</p>
              <p className="text-xl tabular-nums">{users.length}</p>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-12">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 text-white/40 text-[10px] uppercase  font-bold">
                    <th className="px-6 py-5">User & Status</th>
                    <th className="px-6 py-5 text-center">Plan</th>
                    <th className="px-6 py-5 text-center">Strategies & Status</th>
                    <th className="px-6 py-5 text-center">Activity Metrics</th>
                    <th className="px-6 py-5 text-right">API Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((user) => (
                    <UserRow key={user._id} user={user} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {users.map((user) => (
                <UserCard key={user._id} user={user} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Sub-component for Desktop Rows
function UserRow({ user }) {
  const liveCount = user.strategies?.filter((s) => s.mode === "LIVE").length || 0;
  const paperCount = user.strategies?.filter((s) => s.mode === "PAPER").length || 0;
  const running = user.strategies?.filter((s) => s.status === "running").length || 0;
  const stopped = user.strategies?.filter((s) => s.status === "stopped").length || 0;
  const error = user.strategies?.filter((s) => s.status === "error").length || 0;

  return (
    <tr className="hover:bg-white/[0.02] transition-colors group">
      <td className="px-6 py-6">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${user.active ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-white/20'}`} />
          <div className="flex flex-col">
            <span className="font-medium text-white/90">{user.email}</span>
            <span className="text-[10px] font-mono text-white/20 uppercase er">{user._id}</span>
          </div>
        </div>
      </td>
      <td className="px-6 py-6 text-center">
        <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${user.plan === 'PRO' || 'PREMIUM' ? 'bg-white text-black border-white' : 'border-white/20 text-white/50'}`}>
          {user.plan}
        </span>
      </td>
      <td className="px-6 py-6 text-center">
        <div className="flex flex-col gap-1 font-mono text-[10px]">
          <div className="flex justify-center gap-3 font-bold">
            <span className="text-white">LIVE {liveCount}</span>
            <span className="text-white">PAPER {paperCount}</span>
          </div>
          <div className="flex justify-center gap-2 text-[9px] uppercase er">
            <span className="text-emerald-400">RUNNING {running}</span>
            <span className="text-white">STOPPED {stopped}</span>
            <span className="text-red-500">ERROR {error}</span>
          </div>
        </div>
      </td>
      <td className="px-6 py-6">
        <div className="flex flex-col items-center gap-1 font-mono text-[10px]">
          <span title="Copilot" className="text-white">COPILOT: {user.copilot}</span>
          <span title="Backtest" className="text-white font-medium ">BACKTEST: {user.backtest}</span>
          <span title="Credits" className="text-white font-medium ">CREDITS: {user.credits}</span>
        </div>
      </td>
      <td className="px-6 py-6 text-right">
        <span className={`text-[10px] font-mono font-bold  ${user.binance?.apiKey ? 'text-emerald-400' : 'text-white/10'}`}>
          {user.binance?.apiKey ? 'BINANCE CONNECTED' : 'BINANCE DISCONNECTED'}
        </span>
      </td>
    </tr>
  );
}

// Sub-component for Mobile Cards
function UserCard({ user }) {
  const liveCount = user.strategies?.filter((s) => s.mode === "LIVE").length || 0;
  const paperCount = user.strategies?.filter((s) => s.mode === "PAPER").length || 0;
  const running = user.strategies?.filter((s) => s.status === "running").length || 0;
  const stopped = user.strategies?.filter((s) => s.status === "stopped").length || 0;
  const error = user.strategies?.filter((s) => s.status === "error").length || 0;

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-white/30 font-mono ">{user._id}</span>
          <span className="font-bold text-lg  max-w-[200px]">{user.email}</span>
        </div>
        <div className={`w-3 h-3 rounded-full ${user.active ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-white/10'}`} />
      </div>
      
      <div className="grid grid-cols-2 gap-2 py-3 border-y border-white/5">
        <div className="space-y-1">
          <p className="text-[9px] text-white/40 uppercase font-bold  ">Engine Modes</p>
          <div className="flex gap-2 text-[10px] font-mono font-bold">
            <span>LIVE {liveCount}</span>
            <span>PAPER {paperCount}</span>
          </div>
        </div>
        <div className="space-y-1 text-right">
          <p className="text-[9px] text-white/40 uppercase font-bold  ">Live Status</p>
          <div className="flex flex-col text-[10px] font-mono font-bold uppercase">
             <span className="text-emerald-400">RUNNING {running}</span>
             <span>STOPPED {stopped}</span>
             <span className="text-red-500">ERROR {error}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 py-1 text-center font-mono text-[10px]">
          <div className="flex flex-col"><span className="text-white/30 uppercase text-[8px]">Credits</span>{user.credits}</div>
          <div className="flex flex-col"><span className="text-white/30 uppercase text-[8px]">Copilot</span>{user.copilot}</div>
          <div className="flex flex-col"><span className="text-white/30 uppercase text-[8px]">Backtest</span>{user.backtest}</div>
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-white/5">
        <span className="text-[10px] font-black bg-white text-black px-3 py-1 rounded-md uppercase">{user.plan}</span>
        <span className={`text-[10px] font-mono font-bold ${user.binance?.apiKey ? 'text-emerald-400' : 'text-white/20'}`}>
          {user.binance?.apiKey ? 'BINANCE CONNECTED' : 'BINANCE DISCONNECTED'}
        </span>
      </div>
    </div>
  );
}