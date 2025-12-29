"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  BarChart3, 
  Zap, 
  Activity, 
  Code2, 
  ShieldCheck,
  ArrowUp,
  Loader2,
  X
} from "lucide-react";

// --- Custom Modern Components ---

const Button = ({ children, className = "", variant = "primary", ...props }: any) => {
  const variants = {
    primary: "bg-white text-black hover:bg-neutral-200 transition-colors shadow-lg",
    secondary: "bg-zinc-900/50 text-white border border-zinc-800 hover:bg-zinc-800 backdrop-blur-md",
    purple: "bg-purple-600/10 text-purple-400 border border-purple-500/20 hover:bg-purple-600/20"
  };

  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`px-8 py-3 rounded-md font-medium transition-all duration-300 flex items-center justify-center gap-2 ${variants[variant as keyof typeof variants]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
};

const FeatureCard = ({ icon: Icon, title, description, badge }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="group relative p-8 rounded-[32px] bg-zinc-950 border border-zinc-900 hover:border-zinc-700 transition-all duration-500 overflow-hidden"
  >
    <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="relative z-10">
      <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center mb-6 border border-zinc-800 group-hover:border-purple-500/50 transition-colors">
        <Icon className="w-6 h-6 text-white group-hover:text-purple-400" />
      </div>
      {badge && <span className="text-[10px] font-bold tracking-widest text-purple-500 uppercase mb-2 block">{badge}</span>}
      <h3 className="text-2xl font-semibold text-white mb-3">{title}</h3>
      <p className="text-zinc-500 leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

// --- Main Page ---

export default function AILandingPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Typography Animation Logic ---
  useEffect(() => {
    const phrases = [
      "Buy BTC when EMA 9 crosses above EMA 21 on 1h charts...",
      "Sell ETH if RSI exceeds 70 and MACD shows bearish divergence...",
      "Execute a scalp strategy on SOL using Bollinger Band breakouts...",
      "Long BNB when whale accumulation is detected on-chain..."
    ];

    let currentPhraseIdx = 0;
    let currentCharIdx = 0;
    let isDeleting = false;
    let typingSpeed = 100;

    const animate = () => {
      const currentPhrase = phrases[currentPhraseIdx];

      if (isDeleting) {
        setInput(currentPhrase.substring(0, currentCharIdx - 1));
        currentCharIdx--;
        typingSpeed = 100;
      } else {
        setInput(currentPhrase.substring(0, currentCharIdx + 1));
        currentCharIdx++;
        typingSpeed = 100;
      }

      if (!isDeleting && currentCharIdx === currentPhrase.length) {
        isDeleting = true;
        typingSpeed = 2000; // Pause at the end of phrase
      } else if (isDeleting && currentCharIdx === 0) {
        isDeleting = false;
        currentPhraseIdx = (currentPhraseIdx + 1) % phrases.length;
        typingSpeed = 500; // Pause before starting next phrase
      }

      setTimeout(animate, typingSpeed);
    };

    const timeout = setTimeout(animate, typingSpeed);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="min-h-screen bg-[#05010d] text-white selection:bg-purple-500/30 font-sans ">
      
      {/* Background Radial Gradients to match image UI */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="p-5 relative overflow-hidden flex flex-col items-center">

        <div className="max-w-5xl mx-auto text-center z-10">
          <motion.h1 
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  className="text-3xl md:text-7xl font-bold tracking-tight mb-8 text-white max-w-4xl mx-auto leading-[1.1]"
>
  {/* Top Line */}
  <span className="block mb-2">
    Build Trading Algorithm In Seconds
  </span>
  
  {/* Bottom Line (Branding) */}
  <div className="flex items-center justify-center gap-3 mt-4">
    <span className="text-xl md:text-4xl font-light text-zinc-100 tracking-normal">
      Reinvented by
    </span>
    <div className="flex items-center gap-1 rounded-2xl">
      <img 
        src="/logo.png" 
        alt="Richacle" 
        className="w-8 h-8 md:w-12 md:h-12 object-contain" 
      />
      <span className="text-2xl md:text-5xl font-light tracking-[0.15em] theseason">
        RICHACLE
      </span>
    </div>
  </div>
</motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed text-xs md:text-lg"
          >
            Build, backtest, and deploy hyper-efficient trading strategies <br className="hidden md:block"/> 
            in natural language. Directly integrated with Binance for seamless execution.
          </motion.p>

        </div>

        {/* --- MAIN PROMPT UI (From Image) --- */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-4xl px-4"
        >
          

          <div className="relative group max-w-3xl mx-auto">
            {/* Glow effect behind prompt */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 to-transparent blur-xl opacity-50" />
            
            <div className="relative bg-[#0a0a0a] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
              <textarea
                value={input}
                readOnly
                placeholder="Buy BTC when EMA 9 crosses above EMA 21..."
                className="w-full bg-transparent p-6  text-zinc-300 outline-none resize-none md:h-44 text-sm md:text-base placeholder:text-zinc-700 cursor-default"
              />
              
              <div className="flex items-center justify-between p-3">
                <span className="text-xs animate-pulse font-bold text-zinc-500  uppercase">
                  GPT-5.1
                </span>
                
                 <Link href="/dashboard"><button 
                  className="bg-zinc-200 p-2 rounded-full group hover:bg-white transition-colors"
                >
                  <ArrowUp className="md:w-5 md:h-5 w-4 h-4 text-black" />
                </button></Link>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-3 mb-5 text-xs md:text-xl"
          >
            <Link href="/dashboard">
              <Button >Get started</Button>
            </Link>
            <Link href="/strategy">
              <Button variant="secondary">Create Strategy</Button>
            </Link>
          </motion.div>

      {/* Feature Grid */}
      <section className="py-32 px-6 bg-[#030008]/50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4 text-white">Engineered for Alpha.</h2>
            <p className="text-zinc-500 text-lg">Four pillars of institutional-grade algorithmic trading.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard 
              icon={Activity}
              badge="Monitor"
              title="Real-time P&L"
              description="Unified dashboard for your entire portfolio across spot and futures markets."
            />
            <FeatureCard 
              icon={Code2}
              badge="Build"
              title="AI Code Editor"
              description="Describe your strategy in English; our AI agent writes the high-performance Python code."
            />
            <FeatureCard 
              icon={BarChart3}
              badge="Verify"
              title="Backtesting"
              description="Test strategies against 10 years of historical Binance tick data in seconds."
            />
            <FeatureCard 
              icon={Zap}
              badge="Deploy"
              title="1-Click Live"
              description="Seamlessly transition from Paper Trading to Live execution on Binance."
            />
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-24 border-y border-zinc-900 bg-zinc-950/20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">
            <div>
                <h3 className="text-3xl font-bold mb-4">Native Binance Integration</h3>
                <p className="text-zinc-500 max-w-md leading-relaxed">Secure API connectivity with end-to-end encryption. Trade BTC, ETH, and 500+ pairs with the world's most liquid exchange.</p>
                <div className="flex items-center gap-6 mt-8 opacity-40">
                    <span className="font-black text-2xl tracking-tighter italic">BINANCE</span>
                    <span className="font-black text-2xl tracking-tighter italic">TRADINGVIEW</span>
                </div>
            </div>
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-white rounded-2xl blur opacity-10" />
                <div className="relative bg-zinc-950 p-8 rounded-2xl border border-zinc-900">
                    <ShieldCheck className="w-12 h-12 text-purple-500 mb-4" />
                    <p className="text-xl font-semibold mb-2">Non-Custodial Security</p>
                    <p className="text-zinc-500 text-sm">We never touch your funds. Your API keys are encrypted locally.</p>
                </div>
            </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-40 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 bg-gradient-to-r from-zinc-400 via-white to-zinc-400 bg-clip-text text-transparent">
            Ready to beat the market?
          </h2>
          <div className="flex items-center justify-center gap-3 text-xs md:text-xl">
             <Link href="/dashboard"> <Button >Get Access Now</Button></Link>
            <Link href="/strategy"> <Button variant="secondary" >Create with Copilot</Button></Link>
          </div>
        </div>
      </section>
    </div>
  );
}