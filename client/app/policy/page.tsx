"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PolicyPage() {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto px-4 py-10 text-white"
    >
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center mb-6 text-gray-300 hover:text-white"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back
      </button>

      <h1 className="text-3xl font-bold mb-6">
        Platform Policies — RICHACLE No-Code AI Algorithmic Trading
      </h1>

      {/* PRIVACY POLICY */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Privacy Policy</h2>
        <p className="text-gray-300 leading-relaxed">
          RICHACLE collects and processes only the minimum data required to run and
          optimize the No-Code AI Algorithm Trading System. This includes account
          information, API key connections, usage analytics, trading rules created
          by users, and platform performance logs.
          <br /><br />
          Your trading logic, algorithm inputs, and API keys are encrypted and
          stored securely. We do not sell, share, or distribute personal or trading
          data to third-party entities.
          <br /><br />
          You are responsible for protecting your login credentials, and for any
          broker-side API permissions granted to the platform.
        </p>
      </section>

      {/* REFUND POLICY — free trial removed */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Refund Policy</h2>
        <p className="text-gray-300 leading-relaxed">
          All payments made on RICHACLE are final, non-cancelable, and
          non-refundable. Due to the nature of a software-as-a-service platform,
          once access is granted, delivery is considered complete.
          <br /><br />
          Algorithmic trading outcomes depend on market conditions and user-defined
          logic. No profits are promised or guaranteed. Refunds cannot be issued
          for losses, execution errors, or market volatility.
        </p>
      </section>

      {/* GENERAL POLICIES */}
      <section>
        <h2 className="text-2xl font-semibold mb-2">General Policies</h2>
        <ul className="list-disc list-inside text-gray-300 leading-relaxed">
          <li>Accounts are individual and non-transferable.</li>
          <li>Users must register with accurate, verifiable information.</li>
          <li>
            RICHACLE may update platform policies when required. Major changes
            will be communicated to users via in-app notice.
          </li>
          <li>
            Use of the platform — including AI-driven trading generation,
            automation, and execution — is entirely at the user’s own risk.
          </li>
          <li>
            RICHACLE is not responsible for financial losses, API delays,
            exchange/broker downtime, or technical disruptions.
          </li>
          <li>
            Users must comply with regional regulatory and trading laws before
            using automated execution features.
          </li>
        </ul>
      </section>
    </motion.div>
  );
}
