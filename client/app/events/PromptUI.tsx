"use client"

import react from "react"
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowUp,
} from "lucide-react";
import React, { useState, useRef } from "react"
import { useRouter } from "next/navigation";

export default function Home() {

  const router = useRouter();
  const textareaRef = useRef(null);
  const [selectedModel, setSelectedModel] = useState("claude-4.7");
  const [inputValue, setInputValue] = useState("");

  const models = [
  { id: "claude-4.7", name: "Claude Opus 4.7" },
  { id: "gpt-5.4", name: "GPT 5.4" },
  { id: "gemini-3.1", name: "Gemini 3.1 Pro" },
  { id: "grok-4.2", name: "Grok 4.2" },
  { id: "deepseek-v3.2", name: "Deepseek-V3.2" },
]

const suggestions = [
  { label: "Michael Burry says Market is 'minutes' away from Big Crash!" },
  { label: "What is in the US Senate's landmark crypto bill?" },
  { label: "Why is bitcoin price down? BTC at $79,000 as Xi warns Trump on Taiwan conflict."},
]

const handleRedirect = () => {
    router.push("/dashboard");
  };

const handleSuggestionClick = (label: string) => {
    setInputValue(label);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  return (
    <div>
      <AnimatePresence>
          { (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="p-4 w-[92vw] sm:w-[70vw] md:w-[50vw] lg:w-[38vw] xl:w-[30vw] relative z-50"
            >
    <h1 className="theseason text-[3.5rem] xs:text-[4.5rem] sm:text-[6rem] md:text-[8rem] lg:text-[10rem] absolute -top-8 md:-top-25 left-8  md:-left-28  text-white/10">RICHACLE</h1>
              <div className="relative bg-[#0d0d0d] rounded-2xl border border-white/10 p-4 flex flex-col min-h-[140px] focus-within:border-white/20 transition-all">
                <textarea
                  ref={textareaRef}
                  rows={2}
                  maxLength={500}
                  placeholder="Ask Richacle"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full bg-transparent border-none outline-none focus:ring-0 text-[14px] px-0 py-0 resize-none placeholder:text-white/50 text-white "
                />
                <div className="flex justify-between items-center mt-auto">


                <Select value={selectedModel} onValueChange={setSelectedModel}>
  <SelectTrigger className=" border-none bg-transparent p-2 focus:ring-0 focus:ring-offset-0 gap-1 text-[11px] font-semibold text-white/70  hover:text-white transition-colors cursor-pointer outline-none ">
    <SelectValue />
  </SelectTrigger>
 
  <SelectContent side="top" sideOffset={3} align="start" position="popper"  className="text-white ">
    {models.map((model) => (
      <SelectItem
        key={model.id}
        value={model.id}
        className="text-[11px] font-semibold focus:text-white cursor-pointer transition-colors"
      >
        {model.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
                  <button  onClick={handleRedirect}
                    className={`p-1.5 bg-white cursor-pointer text-black rounded-full  transition-all active:scale-90 shadow-xl `}
                  >
                    <ArrowUp size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* Suggestion lines */}
              <div className="mt-3 flex flex-col">
                {suggestions.map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.08, duration: 0.4, ease: "easeOut" }}
                    onClick={() => handleSuggestionClick(item.label)}
                    className="group flex items-center justify-between px-1 py-2.5 border-b border-white/[0.06] hover:border-white/[0.14] cursor-pointer transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <span className="md:text-[15px] text-[13px] font-semibold text-white/80 group-hover:text-white transition-colors duration-300 tracking-wide">
                        {item.label}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}