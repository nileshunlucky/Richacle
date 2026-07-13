"use client";
import React from "react";
import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full py-6 z-50 relative px-10">
      {/* Primary Full-Width Purple Wash */}
<div 
  className="absolute bottom-0 left-0 w-full h-[350px] pointer-events-none z-0"
  style={{
    background: 'linear-gradient(0deg, rgba(147, 51, 234, 0.4) 0%, rgba(107, 33, 168, 0.15) 50%, transparent 100%)',
  }}
/>

{/* High-Intensity Bottom Edge - This adds the "Bright" pop */}
<div 
  className="absolute bottom-0 left-0 w-full h-[2px] bg-purple-500 shadow-[0px_0px_100px_40px_rgba(168,85,247,0.6)] pointer-events-none z-0"
/>

{/* Soft Ambient Spread - Extra blur to prevent harsh lines */}
<div 
  className="absolute bottom-[-100px] left-0 w-full bg-purple-600/20 blur-[120px] pointer-events-none z-0"
/>
    <div className="text-center pt-24 pb-12 my-10">
        <h2 className="text-white md:text-6xl text-4xl md:text-6xl font-semibold mb-8">
          Try <span className="theseason font-light">Richacle</span>  now.
        </h2>
        <Link href="/dashboard"><button className="inline-flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium px-6 py-3 rounded-full transition-colors cursor-pointer">
          Get started
        </button></Link>
      </div>
      <div className="  p-5 spacemono text-white rounded-lg">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">

          {/* Copyright */}
          <p className="text-sm  text-center">
            © {year} <span className="theseason">RICHACLE</span> Inc. All rights reserved.
          </p>

          {/* Links + social */}
          <div className="flex md:flex-row flex-col items-center flex-wrap md:gap-6 gap-3 justify-center">

            {/* Links */}
            <ul className="flex items-center gap-4">
              <li>
                <Link
                  href="/policy"
                  className="text-sm  hover:text-white/70 transition"
                >
                  Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm  hover:text-white/70 transition"
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link
                  href="https://richacle.lemonsqueezy.com/affiliates"
                  className="text-sm  hover:text-white/70 transition"
                >
                  Affiliate
                </Link>
              </li>
            </ul>

            <div className="flex text-center text-sm items-center gap-4">
            {/* Telegram */}
            <Link
              href="https://t.me/richacle"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2  hover:text-white/70 transition"
            >
              Telegram
            </Link>
            {/* X */}
            <Link
              href="https://X.com/richacleai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2  hover:text-white/70 transition"
            >
              X
            </Link>
            <Link
              href="https://instagram.com/richaclee"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-white/70 transition"
            >
              Instagram
            </Link>
            </div>

          </div>
        </div>
      </div>
    </footer>
  );
}