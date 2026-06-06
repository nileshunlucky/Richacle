"use client";
import React from "react";
import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full py-6 z-50 relative px-10">
      <div className="  p-5 spacemono text-black bg-white rounded-lg">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">

          {/* Copyright */}
          <p className="text-sm  text-center">
            © {year} <span className="">RICHACLE</span> Inc. All rights reserved.
          </p>

          {/* Links + social */}
          <div className="flex md:flex-row flex-col items-center flex-wrap md:gap-6 gap-3 justify-center">

            {/* Links */}
            <ul className="flex items-center gap-4">
              <li>
                <Link
                  href="/policy"
                  className="text-sm  hover:text-black transition"
                >
                  Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm  hover:text-black transition"
                >
                  Terms
                </Link>
              </li>
              <li>
                <a
                  href="https://richacle.lemonsqueezy.com/affiliates"
                  className="text-sm  hover:text-black transition"
                >
                  Affiliate
                </a>
              </li>
            </ul>

            <div className="flex text-center text-sm items-center gap-4">
            {/* Telegram */}
            <a
              href="https://t.me/richacle"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2  hover:text-black transition"
            >
              Telegram
            </a>
            {/* X */}
            <a
              href="https://X.com/richacleai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2  hover:text-black transition"
            >
              X
            </a>
            <a
              href="https://instagram.com/richaclee"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-black transition"
            >
              Instagram
            </a>
            </div>

          </div>
        </div>
      </div>
    </footer>
  );
}
