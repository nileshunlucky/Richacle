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
      <p className=" leading-relaxed">{description}</p>
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

  const models = [
    { name: "ChatGPT", url: "https://www.edigitalagency.com.au/wp-content/uploads/new-ChatGPT-icon-white-png-large-size.png" },
    { name: "Claude", url: "https://img.icons8.com/ios11/512/FFFFFF/claude-ai.png" },
    { name: "Gemini", url: "https://img.icons8.com/ios_filled/512/FFFFFF/gemini-ai.png" },
    { name: "Grok", url: "https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/dark/grok.png" },
    { name: "Perplexity", url: "https://cdn.prod.website-files.com/68428da21ec2311e5b9a79c1/68428da31ec2311e5b9a7abf_afeb44866d2933f38e70eadb99b66a12_integration-section-icon-5.png" },
    { name: "Llama", url: "https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/dark/meta.png" },
    { name: "DeepSeek", url: "https://img.icons8.com/ios11/512/FFFFFF/deepseek.png" },
    { name: "Qwen", url: "https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/dark/qwen.png" },
  ];

  return (
    <div className="min-h-screen  font-sans ">


      <div className="relative z-50">

      {/* Hero Section */}
      <section className="p-5 relative overflow-hidden flex flex-col items-center gap-5 ">
      

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
            className="text-zinc-300 mb-10 max-w-2xl mx-auto md:text-lg"
          >
            Build, Backtest, and Deploy. <br /> 
            Create crypto algos by chatting with AI
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
            
            
            <div className="relative bg-[#0a0a0a] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
              <textarea
                value={input}
                readOnly
                placeholder="Buy BTC when EMA 9 crosses above EMA 21..."
                className="w-full bg-transparent p-6  text-zinc-300 outline-none resize-none md:h-44 text-sm md:text-base placeholder:text-zinc-700 cursor-default"
              />
              
              <div className="flex items-center justify-between p-3">
                <span className="text-xs animate-pulse font-bold  theseason  uppercase">
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

     <section className="relative py-24 bg-black overflow-hidden flex flex-col items-center justify-center">
      
      {/* HEADER */}
      <div className="text-center mb-16 z-10 px-4">
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-white text-[22px] md:text-6xl font-bold tracking-tight leading-tight"
        >
          The High-Frequency Trade.<br />
          <span>8 Powerful Models, 1 Execution.</span>
        </motion.h2>
      </div>

      {/* ORBIT CONTAINER */}
      {/* Using a CSS variable --radius for responsive distance */}
      <div className="relative w-[300px] h-[300px] md:w-[500px] md:h-[500px] flex items-center justify-center [--radius:120px] md:[--radius:220px]">
        
        {/* CENTRAL LOGO */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          className="relative z-50 w-20 h-20 md:w-28 md:h-28 rounded-full bg-black border border-white/10 flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.1)]"
        >
          <img src="/logo.png" alt="Richacle" className="w-10 h-10 md:w-14 md:h-14 object-contain" />
          <div className="absolute inset-[-20px] rounded-full border border-zinc-900/50" />
          <div className="absolute inset-[-60px] md:inset-[-100px] rounded-full border border-zinc-900/30" />
        </motion.div>

        {/* ORBITING LLMS */}
        {models.map((llm, idx) => {
          const angle = idx * 45; 
          return (
            <motion.div
              key={llm.name}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="absolute"
              style={{
                // No JS window checks here = No Hydration Error
                transform: `rotate(${angle}deg) translateY(calc(-1 * var(--radius))) rotate(-${angle}deg)`
              }}
            >
              <div className="group relative flex flex-col items-center gap-1">
                <div className="w-12 h-12 md:w-20 md:h-20 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center backdrop-blur-sm transition-all duration-500 group-hover:border-white group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                  <img src={llm.url} alt={llm.name} className="w-6 h-6 md:w-12 md:h-12 object-contain" />
                </div>
                <span className="absolute -bottom-8 text-[9px] md:text-[11px] text-zinc-300 font-bold tracking-widest opacity-100 transition-all">
                  {llm.name}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>

          
 {/* --- PREMIUM 3-STEP WORKFLOW --- */}
      <section className="py-24 md:py-32 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          
          <div className="mb-16 md:mb-24">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-white mb-3">
              Three simple steps
            </h2>
            <p className=" text-base md:text-lg">Build, test, deploy. all in 1</p>
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
                <p className="text-sm  leading-relaxed">
                  Describe your strategy in plain English. <span className="theseason">RICHACLE</span> builds the logic instantly.
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
                <p className="text-sm  leading-relaxed">
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
                      <span className="text-xs ">Exchange</span>
                      <span className="text-xs text-white font-medium">Binance</span>
                    </div>
                    <div className="flex justify-between items-center bg-black/50 border border-zinc-800 rounded-lg p-2.5">
                      <span className="text-xs ">Mode</span>
                      <span className="text-xs text-white font-medium">Demo Trading</span>
                    </div>
                  </div>
                </div>
                
                <button className="w-full py-3 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors">
                  Deploy
                </button>
              </div>

              <div className="mt-6 space-y-2">
                <h3 className="text-lg md:text-xl font-medium text-white">Deploy & Execute</h3>
                <p className="text-sm  leading-relaxed">
                  Go Demo/Live trading with one click. Directly connected to Binance API.
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
            <Link href="/strategy"> <Button variant="outline" >Create with Copilot</Button></Link>
          </div>
        </div>
      </section>
    </div>
    </div>
  );
}