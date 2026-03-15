"use client";
import React from "react";
import { Youtube, Twitter } from "lucide-react";
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

          {/* Links + Youtube */}
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
            </ul>

            {/* Youtube */}
            <a
              href="https://Youtube.com/@richacle"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2  hover:text-white transition"
            >
              <Youtube size={20} />
            </a>
            {/* X */}
            <a
              href="https://X.com/richacleai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2  hover:text-white transition"
            >
              <Twitter  size={20} />
            </a>

          </div>
        </div>
      </div>
    </footer>
  );
}
