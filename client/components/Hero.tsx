"use client";

import React, { useEffect, useState } from "react";
import { ArrowUp, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

const models = [
  { name: "Claude", src: "https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/claude-ai-icon.png" },
  { name: "ChatGPT", src: "https://static.vecteezy.com/system/resources/previews/021/059/825/non_2x/chatgpt-logo-chat-gpt-icon-on-green-background-free-vector.jpg" },
  { name: "Grok", src: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRnofBe_ykNgODhdbHQ2hXqiDuYXJXdWHoNgfXFxB_0Jw&s=10" },
  { name: "Gemini", src: "https://cdn-new.godofprompt.dev/admin-media/tools/9237071d-c71e-41d1-ac52-2ffaf374c503.png" },
  { name: "DeepSeek", src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Deepseek-logo-icon.svg/960px-Deepseek-logo-icon.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail" },
];

export default function Hero() {
  const [prompt, setPrompt] = useState("");
  const [loading] = useState(false);
  const [index, setIndex] = useState(0);

  // Swap model every 2.5s
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % models.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const current = models[index];

  return (
    <main className="relative isolate flex min-h-svh w-full flex-col overflow-hidden bg-[linear-gradient(135deg,#8a5a2b_0%,#c89654_45%,#e2b878_100%)] text-white">
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-6 px-4 py-12 text-center sm:gap-8 sm:px-6">
        {/* Headline: always 2 lines, font scales with screen width */}
       <h1 className="theseason font-semibold leading-[1.15] text-[clamp(1.35rem,7.5vw,3.75rem)] mb-5">
          <span className="block whitespace-nowrap">
             Your Crypto AI Trading
          </span>
          <span className="block whitespace-nowrap">
             Agent using{" "}
            {/* Swipe-in / swipe-out model name + logo */}
            <motion.span
              layout
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex h-[1.25em] items-center overflow-hidden align-middle"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={current.name}
                  initial={{ y: "110%", opacity: 0 }}
                  animate={{ y: "0%", opacity: 1 }}
                  exit={{ y: "-110%", opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-flex items-center gap-[0.3em] whitespace-nowrap"
                >
                  <span className="flex h-[1em] w-[1em] shrink-0 items-center justify-center">
                    <img
                      src={current.src}
                      alt={current.name}
                      className="h-full w-full rounded-[0.25em] object-contain"
                      draggable={false}
                    />
                  </span>
                  <span>{current.name}</span>
                </motion.span>
              </AnimatePresence>
            </motion.span>
          </span>
        </h1>

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
            Free credits
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