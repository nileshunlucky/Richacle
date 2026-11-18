"use client";

import React, { useState } from "react";
import { ArrowUp, LoaderCircle } from "lucide-react";
import Link from "next/link";

export default function Hero() {
  const [prompt, setPrompt] = useState("");
  const [loading] = useState(false);

  return (
   <main className="relative isolate flex min-h-svh w-full flex-col overflow-hidden bg-[linear-gradient(135deg,#8a5a2b_0%,#c89654_45%,#e2b878_100%)] text-white">
    
  
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 py-12 text-center sm:gap-8 sm:px-6">
        {/* Headline */}
        <h1 className="theseason font-semibold text-balance text-[1.75rem] leading-[1.15] tracking-tight sm:text-4xl md:text-6xl">
          Your AI Agent for
          <br className="hidden sm:block" /> Predicting Crypto Trades
        </h1>

        <p className="md:text-2xl text-xl">predictions are won before they begins</p>

        {/* CTAs */}
        <div className="flex w-full max-w-xs items-center justify-center gap-2 sm:w-auto sm:max-w-none sm:gap-3">
          <Link
            href="/dashboard"
            className="inline-flex flex-1 items-center justify-center rounded-full bg-white px-5 py-2.5 text-[13px] font-medium text-black transition hover:bg-white/90 sm:flex-none sm:px-6 sm:text-sm"
          >
            Get started
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex flex-1 items-center justify-center rounded-full bg-black px-5 py-2.5 text-[13px] font-medium text-white backdrop-blur-sm transition hover:bg-black/10 sm:flex-none sm:px-6 sm:text-sm"
          >
            Free prediction
          </Link>
        </div>

        {/* Prompt box */}
        <div className="w-full max-w-2xl text-left">
          <div className="rounded-2xl bg-black p-3 sm:p-4">
            <textarea
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask Richacle about a crypto, market, or news..."
              className="w-full resize-none border-0 bg-transparent text-base leading-relaxed text-white outline-none placeholder:text-white/60 placeholder:text-sm focus:ring-0 sm:text-sm"
            />

            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-white sm:text-xs">
                Claude Haiku 5.5
              </span>

              <Link href="/dashboard" aria-label="Send prompt">
                <span className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white text-black transition hover:bg-white/85 sm:h-9 sm:w-9">
                  {loading ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <ArrowUp size={16} strokeWidth={2.5} />
                  )}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}