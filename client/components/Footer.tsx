"use client";
import React from "react";
import { Send, Twitter } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full py-6 z-50 relative">
      <div className="max-w-6xl mx-auto px-4 ">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">

          {/* Copyright */}
          <p className="text-sm  text-center">
            © {year} <span className="theseason">RICHACLE</span> Inc. All rights reserved.
          </p>

          {/* Links + social */}
          <div className="flex items-center flex-wrap gap-6 justify-center">

            {/* Links */}
            <ul className="flex items-center gap-4">
              <li>
                <Link
                  href="/policy"
                  className="text-sm  hover:text-white transition"
                >
                  Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm  hover:text-white transition"
                >
                  Terms
                </Link>
              </li>
              <li>
                <a
                  href="https://richacle.lemonsqueezy.com/affiliates"
                  className="text-sm  hover:text-white transition"
                >
                  Affiliate Program
                </a>
              </li>
            </ul>

            {/* Telegram */}
            <a
              href="https://t.me/richacle"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2  hover:text-white transition"
            >
              <Send size={20} />
            </a>
            {/* X */}
            <a
              href="https://X.com/richacleai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xl  hover:text-white transition"
            >
              𝕏
            </a>

          </div>
        </div>
      </div>
    </footer>
  );
}
