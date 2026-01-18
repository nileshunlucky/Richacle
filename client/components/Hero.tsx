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
  X,
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
    <div className="min-h-screen  font-sans ">

    
      

      {/* Hero Section */}
      <section className="p-5 relative overflow-hidden flex flex-col items-center gap-5 pb-20">

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
{/* Instagram Full Bright Glow with Top (50%) and Bottom (10%) Black Fade */}
<div className="absolute inset-0 overflow-hidden">
  
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

  {/* 3. The Black Bottom Mask (Bottom 10%) */}
  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent h-[30%]" />

  {/* 4. Global Saturation Boost */}
  <div className="absolute inset-0 bg-white/5 mix-blend-overlay pointer-events-none" />

</div>
          

          <div className="relative group max-w-3xl mx-auto">
            {/* Glow effect behind prompt */}
            
            
            <div className="relative bg-[#0a0a0a] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
              <textarea
                value={input}
                readOnly
                placeholder="Buy BTC when EMA 9 crosses above EMA 21..."
                className="w-full bg-transparent p-6  text-zinc-300 outline-none resize-none md:h-44 text-sm md:text-base placeholder:text-zinc-700 cursor-default"
              />
              
              <div className="flex items-center justify-between p-3">
                <span className="text-xs animate-pulse font-bold text-zinc-500 theseason  uppercase">
                  RICHACLE
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
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-3 mb-5 text-xs md:text-xl z-50"
          >
            <Link href="/dashboard">
              <Button >Get started</Button>
            </Link>
            <Link href="/strategy">
              <Button variant="outline">Create Strategy</Button>
            </Link>
          </motion.div>
      </section>

          
 {/* --- PREMIUM 3-STEP WORKFLOW --- */}
      <section className="py-24 md:py-32 px-4 md:px-6 bg-black">
        <div className="max-w-6xl mx-auto">
          
          <div className="mb-16 md:mb-24">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-white mb-3">
              Three simple steps
            </h2>
            <p className="text-zinc-500 text-base md:text-lg">Build, test, deploy — all in 1</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6">
            
            {/* Step 1: Create */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
              
              <div className="h-48 md:h-56 rounded-2xl bg-zinc-950 border border-zinc-800 p-5 flex flex-col justify-between transition-all hover:border-zinc-700">
                <div className="space-y-3">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">AI Input</div>
                  <div className="bg-black/50 border border-zinc-800 rounded-lg p-3">
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      "Buy BTC when RSI drops below 30..."
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                    <span className="text-[9px] text-zinc-600 uppercase tracking-wider">Processing</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <h3 className="text-lg md:text-xl font-medium text-white">Create with AI</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Describe your strategy in plain English. GPT-5 builds the logic instantly.
                </p>
              </div>
            </motion.div>

            {/* Step 2: Backtest */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="group"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              <div className="h-48 md:h-56 rounded-2xl bg-zinc-950 border border-zinc-800 p-5 flex flex-col justify-between transition-all hover:border-zinc-700">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-4">Performance</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/50 border border-zinc-800 rounded-lg p-3">
                      <div className="text-[9px] text-zinc-600 uppercase mb-1">Return</div>
                      <div className="text-lg font-semibold text-white">+247%</div>
                    </div>
                    <div className="bg-black/50 border border-zinc-800 rounded-lg p-3">
                      <div className="text-[9px] text-zinc-600 uppercase mb-1">Win Rate</div>
                      <div className="text-lg font-semibold text-white">68%</div>
                    </div>
                  </div>
                </div>
                <div className="h-12 flex items-end gap-1">
                  {[40, 55, 35, 65, 45, 70, 50, 75, 60, 80].map((h, i) => (
                    <div key={i} className="flex-1 bg-zinc-800 rounded-t" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <h3 className="text-lg md:text-xl font-medium text-white">Backtest Results</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Validate against years of historical data before going live.
                </p>
              </div>
            </motion.div>

            {/* Step 3: Deploy */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="group"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              <div className="h-48 md:h-56 rounded-2xl bg-zinc-950 border border-zinc-800 p-5 gap-3 flex flex-col justify-between transition-all hover:border-zinc-700">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Status</span>
                    <div className="flex items-center gap-2 px-2 py-1 bg-black border border-zinc-800 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span className="text-[9px] text-white font-medium">LIVE</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-black/50 border border-zinc-800 rounded-lg p-2.5">
                      <span className="text-xs text-zinc-500">Exchange</span>
                      <span className="text-xs text-white font-medium">Binance</span>
                    </div>
                    <div className="flex justify-between items-center bg-black/50 border border-zinc-800 rounded-lg p-2.5">
                      <span className="text-xs text-zinc-500">Mode</span>
                      <span className="text-xs text-white font-medium">Paper Trading</span>
                    </div>
                  </div>
                </div>
                
                <button className="w-full py-3 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors">
                  Deploy
                </button>
              </div>

              <div className="mt-6 space-y-2">
                <h3 className="text-lg md:text-xl font-medium text-white">Deploy & Execute</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Go Paper/Live trading with one click. Directly connected to Binance API.
                </p>
              </div>
            </motion.div>

          </div>
        </div>
      </section>
       


      {/* Footer CTA */}
      <section className="my-10 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-7xl font-bold tracking-tighter mb-8 bg-gradient-to-r from-zinc-400 via-white to-zinc-400 bg-clip-text text-transparent">
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