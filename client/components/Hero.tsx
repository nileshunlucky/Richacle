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

const LogoCarousel = () => {
  const logos = [
    { name: "Binance", url: "https://www.pngall.com/wp-content/uploads/10/Binance-Coin-Crypto-Logo-Transparent.png" },
    { name: "TradingView", url: "https://companieslogo.com/img/orig/tradingview.D-0d181e04.png?t=1720244494" },
    { name: "OpenAI", url: "https://img.icons8.com/androidL/512/FFFFFF/chatgpt.png" },
    { name: "LemonSqueezy", url: "https://assets.streamlinehq.com/image/private/w_300,h_300,ar_1/f_auto/v1/icons/logos/lemonsqueezy-ddrqv8rreff6rbq7ilmkfx.png/lemonsqueezy-ty3ju10kqubex1dikb59vf.png" },
    { name: "Vercel", url: "https://apipie.ai/docs/img/Integrations/Vercel-AI/vercel.png" },
  ];

  // Triple the logos to ensure the screen is always full, preventing the "reset jump"
  const tripleLogos = [...logos, ...logos, ...logos];

  return (
    <div className="w-full  py-10 overflow-hidden relative">
      {/* Premium Side Fades */}
      <div className="absolute inset-y-0 left-0 w-24 md:w-48 bg-gradient-to-r from-transparent to-transparent z-20 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 md:w-48 bg-gradient-to-l from-transparent to-transparent z-20 pointer-events-none" />

      <motion.div
        className="flex whitespace-nowrap"
        animate={{
          x: ["0%", "-33.3333%"],
        }}
        transition={{
          duration: 25,
          ease: "linear",
          repeat: Infinity,
        }}
        style={{ width: "max-content" }}
      >
        {tripleLogos.map((logo, index) => (
          <div
            key={index}
            className="flex items-center gap-4 mx-8 md:mx-16 shrink-0"
          >
            <img
              src={logo.url}
              alt={logo.name}
              className={`h-6 md:h-8 w-auto object-contain opacity-50 grayscale hover:opacity-100 transition-opacity duration-300 ${
                logo.name == "LemonSqueezy" ? "invert" : ""
              }`}
            />
            <span className="text-zinc-500 font-medium text-sm md:text-lg ">
              {logo.name}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
};


// --- Main Page ---

export default function AILandingPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Typography Animation Logic ---
  useEffect(() => {

    const phrases = [
  "I want to daytrade BTC/USDT on the 1-minute chart...",
  "Find me a high-probability entry on ETH futures right now...",
  "Analyse SOL market structure and give me TP and SL levels...",
  "Should I go long or short on BNB at current price?",
  "Research XRP momentum and plan my next futures trade...",
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

<img src="https://wallpapercave.com/wp/wp6439117.jpg" alt="logo" className="h-screen w-screen object-cover z-0 fixed top-0 left-0 " />



      <div className="relative z-50 mt-10">

      {/* Hero Section */}
      <section className="p-5 relative overflow-hidden flex flex-col items-center gap-5 ">
      

        <div className="max-w-5xl mx-auto text-center z-10">
          <motion.h1 
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  className="text-3xl md:text-6xl font-bold  mb-8 text-white max-w-7xl mx-auto "
>
  {/* Top Line */}
  <div className="block mb-2">
    The World's Most Powerful <span className="theseason">Realtime Research</span> Trading AI Agent
  </div>

</motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-200 mb-10 max-w-2xl mx-auto md:text-xl"
          >
            Built to make you extraordinarily wealthy, <br/> <span className="font-light theseason">
        RICHACLE
      </span> is the smart way to trade with AI.
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
                placeholder="Ask Richacle"
                className="w-full bg-transparent p-6  text-zinc-300 outline-none resize-none md:h-44 text-sm md:text-base placeholder:text-zinc-700 cursor-default"
              />
              
              <div className="flex items-center justify-between p-3">
                <span className="text-xs md:text-lg theseason  uppercase">
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
              <Button >Get started Daytarding</Button>
            </Link>
          </motion.div>
      </section>

     
<LogoCarousel />
          
 {/* --- PREMIUM 3-STEP WORKFLOW --- */}
      <section className="py-24 md:py-32 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          
          <div className="mb-16 md:mb-24">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-semibold  text-white mb-3">
              Three simple steps
            </h2>
            <p className=" text-base md:text-lg">Chat, Research, Trade - all in 1</p>
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
                  <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Prompt</div>
                  <div className="bg-black/50 border border-zinc-800 rounded-lg p-3">
                    <p className="text-xs text-zinc-400 ">
                      "Daytrade on Bitcoin at 5min..."
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                    <span className="text-[9px] font-semibold text-zinc-500 uppercase animate-pulse">Researching</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <h3 className="text-lg md:text-xl font-medium text-white">Chat with AI</h3>
                <p className="text-sm  leading-relaxed">
                  Describe your Daytrading strategy in plain English. <span className="theseason">RICHACLE</span> agent research the market deeply.
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
                <div className="flex flex-col gap-1">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-2 gap-1">Research</div>
                    <div className="bg-black/50 border border-zinc-800 rounded-lg p-2">
                      <div className="text-[9px] text-zinc-600 uppercase mb-1">BUY</div>
                      <div className="text-lg font-semibold text-white">$71200</div>
                    </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="bg-black/50 border border-zinc-800 rounded-lg p-2">
                      <div className="text-[9px] text-zinc-600 uppercase mb-1">Take Profit</div>
                      <div className="text-lg font-semibold text-white">$71500</div>
                    </div>
                    <div className="bg-black/50 border border-zinc-800 rounded-lg p-2">
                      <div className="text-[9px] text-zinc-600 uppercase mb-1">Stop Loss</div>
                      <div className="text-lg font-semibold text-white">$71000</div>
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
                <h3 className="text-lg md:text-xl font-medium text-white">Research Agent</h3>
                <p className="text-sm  leading-relaxed">
                  Realtime research gives you short summary, accurate technical analysis insights.
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
                  Trade
                </button>
              </div>

              <div className="mt-6 space-y-2">
                <h3 className="text-lg md:text-xl font-medium text-white">Trade in 1 click</h3>
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
          <h2 className="text-3xl md:text-7xl font-bold er mb-8 bg-gradient-to-r from-zinc-400 via-white to-zinc-400 bg-clip-text text-transparent">
            Ready to beat the market?
          </h2>
          <div className="flex items-center justify-center gap-3 text-xs md:text-xl">
             <Link href="/dashboard"> <Button >Get Access Now</Button></Link>
          </div>
        </div>
      </section>
    </div>
    </div>
  );
}