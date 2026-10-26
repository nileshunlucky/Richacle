"use client";
import React, { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

type FooterLink = { label: string; href: string; external?: boolean };
type FooterColumn = { title: string; links: FooterLink[]; showFaq?: boolean };

const faqs = [
  {
    q: "What is Richacle?",
    a: "Richacle is an AI research platform that helps you analyze markets and make faster, better-informed decisions.",
  },
  {
    q: "Is Richacle financial advice?",
    a: "No. Richacle provides data and analysis for research only. Always do your own research before trading.",
  },
  {
    q: "How do I get started?",
    a: "Create an account, Open the dashboard and start researching. You can start exploring in a few minutes.",
  },
];

const columns: FooterColumn[] = [
  {
    title: "User Service",
    links: [{ label: "Contact", href: "mailto:richacle.ai@gmail.com" }],
    showFaq: true,
  },
  {
    title: "Brand Ambassador",
    links: [
      {
        label: "Affiliate",
        href: "https://richacle.lemonsqueezy.com/affiliates",
        external: true,
      },
    ],
  },
  {
    title: "Legal Terms",
    links: [
      { label: "Policy", href: "/policy" },
      { label: "Terms", href: "/terms" },
    ],
  },
  {
    title: "Social Media",
    links: [{ label: "Instagram", href: "https://www.instagram.com/traderichacle", external: true }, { label: "YouTube", href: "https://www.youtube.com/@richacle", external: true }],
  },
];

const linkClass =
  "text-sm text-zinc-400 transition-colors hover:text-zinc-100";

const ease = [0.4, 0, 0.2, 1] as const;

function Collapse({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease }}
      className="overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

function FaqItem({
  q,
  a,
  open,
  onToggle,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left text-sm font-medium text-zinc-100"
      >
        {q}
        <ChevronDown
          size={14}
          className={`shrink-0 text-zinc-400 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <Collapse>
            <p className="pt-2 text-xs leading-relaxed text-zinc-400">{a}</p>
          </Collapse>
        )}
      </AnimatePresence>
    </li>
  );
}

function FaqDropdown() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<number | null>(null);

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`${linkClass} flex w-full items-center justify-between gap-2 md:w-auto md:justify-start`}
      >
        FAQ
        <ChevronDown
          size={16}
          className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <Collapse>
            <ul className="mt-4 space-y-4 border-l border-zinc-200 pl-4">
              {faqs.map((item, i) => (
                <FaqItem
                  key={item.q}
                  q={item.q}
                  a={item.a}
                  open={active === i}
                  onToggle={() => setActive(active === i ? null : i)}
                />
              ))}
            </ul>
          </Collapse>
        )}
      </AnimatePresence>
    </li>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-50 w-full bg-black p-2 md:p-3">
      <div className="relative isolate overflow-hidden rounded-2xl bg-black px-6 pb-8 pt-10 md:rounded-3xl md:px-10 md:pt-12">
      

        {/* Columns: 1 col on mobile, 4 on desktop */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4 md:gap-6">
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className=" mb-5 text-lg text-zinc-100">
                {col.title}
              </h3>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      {...(link.external && {
                        target: "_blank",
                        rel: "noopener noreferrer",
                      })}
                      className={linkClass}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {col.showFaq && <FaqDropdown />}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar: Country left, wordmark centered, copyright right */}
        <div className="mt-8 grid grid-cols-1 items-center gap-8 md:grid-cols-3 md:gap-4">
          {/* Country / Region */}
          <div className="flex flex-col md:flex-row md:items-center md:gap-2 md:justify-self-start">
            <span className="text-sm text-zinc-100">Country / Region</span>
            <span className="mt-1 text-sm text-zinc-400 md:mt-0">
              United States (English)
            </span>
          </div>

          {/* Wordmark (centered) */}
          <span className="theseason text-center text-4xl tracking-wide text-zinc-100">
            RICHACLE
          </span>

          {/* Copyright */}
          <p className="text-center text-xs text-zinc-400 md:justify-self-end md:text-sm">
            © {year} Richacle. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}