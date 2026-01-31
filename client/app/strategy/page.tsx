"use client";

import { useEffect, useState } from "react";
import { ArrowUp, Loader2, MoreVertical, Edit2, Play, Trash2, X , ChevronUp } from "lucide-react";
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Strategy {
  id: string;
  name: string;
  input: string;
  llm?: string;
  code: string;
  status: string;
}

const LLM_ICONS: Record<string, string> = {
  ChatGPT: "https://www.edigitalagency.com.au/wp-content/uploads/new-ChatGPT-icon-white-png-large-size.png",
  Claude: "https://img.icons8.com/ios11/512/FFFFFF/claude-ai.png",
  Gemini: "https://img.icons8.com/ios_filled/512/FFFFFF/gemini-ai.png",
  Grok: "https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/dark/grok.png", 
  Perplexity: "https://cdn.prod.website-files.com/68428da21ec2311e5b9a79c1/68428da31ec2311e5b9a7abf_afeb44866d2933f38e70eadb99b66a12_integration-section-icon-5.png", 
  Llama: "https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/dark/meta.png", 
  DeepSeek: "https://img.icons8.com/ios11/512/FFFFFF/deepseek.png", 
  Qwen: "https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/dark/qwen.png", 
};

export default function AlgoTradingLovableUI() {
  const [email, setEmail] = useState("");
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("LIVE");
  const [suggestion, setSuggestion] = useState(""); 
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [loading, setLoading] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [editingStrat, setEditingStrat] = useState<Strategy | null>(null);
  const [copilotEnabled, setCopilotEnabled] = useState(true);
  const [llms, setLlms] = useState(["ChatGPT", "Claude", "Gemini", "Grok", "Perplexity", "Llama", "DeepSeek", "Qwen"])

  const router = useRouter();

  // --- AUTOCOMPLETE LOGIC ---
  useEffect(() => {
    // Clear suggestion when user types
    setSuggestion("");

    if (!copilotEnabled) return;

    const timer = setTimeout(() => {
      if (input.trim().length > 8 && !loadingSuggestion) {
        fetchSuggestion(input);
      }
    }, 800); // 800ms is standard for "fast" copilots

    return () => clearTimeout(timer);
  }, [input, copilotEnabled]);

  const fetchSuggestion = async (currentInput: string) => {
    try {
      setLoadingSuggestion(true);

      if (!email){
      toast.error("Not authenticated");
      return;
     }
      const form = new FormData();
      form.append("prompt", currentInput);
      form.append("email", email);
      
      const res = await fetch("https://api.richacle.com/api/autocomplete", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      setSuggestion(data.suggestion || "");
    } catch (e) {
      console.error("Autocomplete error", e);
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const handleLLMUpdate = async (strategyId: string, newLlm: string) => {
  // 1. Update local UI state immediately for responsiveness
  setStrategies(prev => 
    prev.map(s => s.id === strategyId ? { ...s, llm: newLlm } : s)
  );

  // 2. Sync with your Backend API
  try {
    const form = new FormData();
    form.append("email", email);
    form.append("strategyId", strategyId);
    form.append("llm", newLlm);

    const res = await fetch("https://api.richacle.com/api/update-llm", { // Ensure this endpoint exists
      method: "POST",
      body: form,
    });

    if (!res.ok){
      toast.error("something went wrong!")
    }
  } catch (error) {
    toast.error("Failed to update LLM on server");
    console.error(error)
  }
};
 

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Accept suggestion on Tab or Right Arrow
    if ((e.key === "Tab" || e.key === "ArrowRight") && suggestion) {
      e.preventDefault();
      // Add a space if the input doesn't already end with one
      const separator = input.endsWith(" ") ? "" : " ";
      setInput(input + separator + suggestion);
      setSuggestion("");
    }
  };

  // --- STRATEGY HANDLERS ---
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email || "";
      setEmail(userEmail);
      if (userEmail) fetchStrategies(userEmail);
    };
    getUser();
  }, []);

  const fetchStrategies = async (userEmail: string) => {
    try {
      const res = await fetch(`https://api.richacle.com/user/${userEmail}`);
      const data = await res.json();
      setStrategies(data.strategies || []);
    } catch (e) {
      console.error("Fetch error:", e);
    }
  };

  const handleEdit = (strat: Strategy) => {
    setInput(strat.input);
    setEditingStrat(strat);
    setActiveMenu(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingStrat(null);
    setInput("");
  };

  const handleBacktestRedirect = (stratId: string) => {
    setActiveMenu(null);
    router.push(`/backtest?id=${stratId}`);
  };

  const sendAI = async () => {
    if (!input.trim()) return toast.error("Describe your strategy");
    if (!email){
      toast.error("Not authenticated");
      return;
    }

    try {
      setLoading(true);
      const form = new FormData();
      form.append("email", email);
      form.append("input", input);
      if (editingStrat) form.append("id", editingStrat.id);

      const res = await fetch("https://api.richacle.com/api/strategy", {
        method: "POST",
        body: form,
      });

      if (res.status === 403) {
        toast.error("Insufficient credits.");
        router.push("/pricing");
        return;
      }

      if (res.ok) {
        toast.success(editingStrat ? "Algorithm updated" : "Algorithm generated");
        setInput("");
        setEditingStrat(null);
        fetchStrategies(email);
      }
    } catch (e) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async (stratId: string) => {
    if (!email){
      toast.error("Not authenticated");
      return;
    }

      setActiveMenu(null);
    try {

      const res = await fetch("https://api.richacle.com/api/deploy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", 
      },
      body: JSON.stringify({
        email: email,
        strategyId: stratId,
      }),
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
        toast.error("Limit reached! Upgrade your Plan");
         router.push("/pricing");
        return;
      }

      if (res.status === 403 && data.detail.includes("Binance")) {
        toast.error("Binance API keys missing!.");
        router.push("/dashboard");
        return;
      }

      toast.success(`Algo deployed`)
      router.push("/dashboard");
    } catch (e) {
      toast.error("Something went wrong");
      console.error(e)
    }
  };

  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden bg-black text-white pb-20">


      <div className="relative z-10 flex h-full flex-col items-center px-4 pt-20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2">
          <h1 className="text-3xl md:text-5xl font-semibold text-center md:text-left">
            Build Trading Algorithm
          </h1>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="logo" className="w-7 h-7 md:w-12 md:h-12" />
            <p className="text-3xl md:text-5xl  theseason">RICHACLE</p>
          </div>
        </div>

        <p className="mt-4 text-center text-zinc-400 max-w-xl md:text-xl text-sm">
          Create crypto algos by chatting with AI
        </p>

        {/* Prompt Box */}
        <div className="mt-10 w-full max-w-3xl">
          <div className={`relative rounded-2xl bg-zinc-950 border ${editingStrat ? 'border-white' : 'border-zinc-800'} shadow-xl backdrop-blur transition-all duration-300`}>
            
            {editingStrat && (
              <div className="absolute -top-3 left-4 flex items-center gap-2 bg-white text-black text-[10px] px-2 py-1 rounded font-bold uppercase z-20">
                <span>{editingStrat.name || "EDITING"}</span>
                <button onClick={cancelEdit} className="hover:opacity-70 border-l border-black/20 pl-1">
                  <X size={12} strokeWidth={3} />
                </button>
              </div>
            )}

            {/* GHOST SUGGESTION LAYER */}
<div 

  className="absolute inset-0 w-full px-5 py-6 text-sm whitespace-pre-wrap break-words z-20 pointer-events-none"
  style={{ fontFamily: 'inherit', lineHeight: '1.5', letterSpacing: 'normal' }}
>
  <span className="text-transparent">{input}</span>

  {copilotEnabled && suggestion && (
    <span 
      onClick={() => {
        const separator = input.endsWith(" ") ? "" : " ";
        setInput(input + separator + suggestion);
        setSuggestion("");
      }}
      className="text-zinc-600 italic cursor-pointer pointer-events-auto hover:text-zinc-400 transition-colors"
    >
      {` ${suggestion}`}
    </span>
  )}
</div>
            
            <textarea
              value={input}
              disabled={loading}
              onKeyDown={handleKeyDown}
              onChange={(e) => setInput(e.target.value)}
              rows={4}
              spellCheck={false}
              placeholder="Buy BTC when EMA 9 crosses above EMA 21..."
              className="relative z-10 w-full resize-none bg-transparent px-5 py-6 text-sm text-white outline-none placeholder:text-zinc-500 disabled:opacity-50"
              style={{ lineHeight: '1.5' }}
            />
            
            <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="text-[10px] text-zinc-500 uppercase font-bold">
                {loadingSuggestion ? <h1><span className="theseason">RICHACLE</span> <span className="animate-pulse">COPILOT</span></h1> : suggestion ? "Press Tab to accept" : <h1><span className="theseason">RICHACLE</span> Copilot</h1>}
              </div>
            <Switch 
              checked={copilotEnabled} 
              onCheckedChange={setCopilotEnabled}
              className="data-[state=checked]:bg-white data-[state=unchecked]:bg-zinc-800"
            />
            </div>

              <button
                onClick={sendAI}
                disabled={loading || !input}
                className="h-9 w-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Strategies Section */}
        <div className="mt-12 w-full max-w-3xl space-y-4">
          <h2 className="text-xs uppercase">My Strategies</h2>
          
          <div className="flex flex-col-reverse gap-3">
            {strategies.map((strat) => (
              <div 
                key={strat.id} 
                className={`group relative flex flex-col justify-between rounded-xl border ${editingStrat?.id === strat.id ? 'border-white' : 'border-zinc-800'} p-5 hover:border-zinc-500 transition-all bg-black`}
              >
                <div className="flex justify-between items-center gap-1">
                  <div className="">
                  <div className="flex items-center justify-between gap-1">   
                    <h3 className="font-medium text-white">{strat.name}</h3>

                    {strat?.llm &&
                      <div>
                      <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <div className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity outline-none">
      <img src={LLM_ICONS[strat.llm]} className="w-4 h-4 object-contain" alt={strat.llm} />
        <h4 className="text-sm font-medium text-zinc-100">{strat.llm}</h4>
        <ChevronUp className="w-4 h-4 text-zinc-400" />
      </div>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 p-1 min-w-[120px]">
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        {llms.map((model) => (
          <DropdownMenuItem
            key={model}
            onClick={() => handleLLMUpdate(strat.id, model)}
            className="text-zinc-100 flex items-center focus:bg-zinc-900 focus:text-white cursor-pointer text-sm"
          >
          <img 
            src={LLM_ICONS[model]} 
            className="w-4 h-4 object-contain" 
            alt={model} 
          />
            {model}
          </DropdownMenuItem>
        ))}
      </motion.div>
    </DropdownMenuContent>
  </DropdownMenu>

                      </div>
                      }
                  </div>
                    <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{strat.input}</p>
                  </div>

                  <div className="relative">
                    <button 
                      onClick={() => setActiveMenu(activeMenu === strat.id ? null : strat.id)}
                      className="p-1 hover:bg-white/10 rounded-md transition"
                    >
                      <MoreVertical size={20} className="text-zinc-500" />
                    </button>

                    {activeMenu === strat.id && (
                      <div className="absolute right-0 mt-2 w-40 rounded-lg border border-zinc-800 bg-black z-50 overflow-hidden shadow-2xl">
                        <button 
                          onClick={() => handleEdit(strat)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-xs text-zinc-300 hover:bg-white hover:text-black transition"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleBacktestRedirect(strat.id)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-xs text-zinc-300 hover:bg-white hover:text-black transition border-t border-zinc-900"
                        >
                          Backtest
                        </button>
                        {strat.status === "running" ? (
  <div className="flex w-full items-center gap-3 px-4 py-3 text-xs text-zinc-300 border-t border-zinc-900 cursor-not-allowed animate-pulse">
    Running
  </div>
) : (
  <button
      onClick={() => handleDeploy(strat.id)}
     className="flex w-full items-center gap-3 px-4 py-3 text-xs text-zinc-300 hover:bg-white hover:text-black transition border-t border-zinc-900"
    >
      Deploy
    </button>
)}

                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {strategies.length === 0 && (
              <div className="py-20 text-center">
                <p className=" text-[10px] uppercase tracking-[0.2em]">No Strategy Yet!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}