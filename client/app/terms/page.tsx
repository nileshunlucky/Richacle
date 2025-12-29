"use client";

import React from "react";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full bg-black text-white py-16 px-5 flex justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl space-y-10"
      >
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>

        <div>
          <h1 className="text-3xl font-bold">Terms & Conditions</h1>
          <p className="text-neutral-500 text-sm mt-1">
            RICHACLE — No-Code AI Algorithm Trading Platform — Last updated{" "}
            {new Date().getFullYear()}
          </p>
        </div>

        <Separator className="bg-neutral-800" />

        {/* 1 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            By accessing or using RICHACLE, you acknowledge and agree to these Terms
            & Conditions. If you do not agree, discontinue use immediately.
          </p>
        </section>

        {/* 2 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Use of the Platform</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            RICHACLE enables users to build, automate, and execute trading systems
            using No-Code AI logic. It may be used solely for legal trading
            activities. Attempts to reverse-engineer, exploit system functions, or
            manipulate markets may result in immediate permanent account termination.
          </p>
        </section>

        {/* 3 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Market Risk & Disclaimer</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Financial markets involve risk. No profitability, outcome, or trading
            result is guaranteed. AI-generated trading logic does not eliminate
            risk. You acknowledge that all trading decisions and algorithm
            configurations are executed at your own discretion and responsibility.
          </p>
        </section>

        {/* 4 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Data Privacy</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            User information, API keys, and trading configurations are collected
            solely to operate and enhance the platform. We do not sell or distribute
            user or trading information. You are responsible for maintaining the
            confidentiality of your credentials and broker permissions.
          </p>
        </section>

        {/* 5 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Billing & Payments</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            All payments are final, non-cancelable, and non-refundable once access
            to the platform is granted. Subscription renewals occur automatically
            unless cancelled in advance of the renewal date. No refunds are issued
            for trading loss, API errors, system unavailability, or user-generated
            logic underperformance.
          </p>
        </section>

        {/* 6 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Limitation of Liability</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            RICHACLE is not liable for losses, market movements, execution delays,
            exchange downtime, third-party broker failures, or financial damages
            caused by automated trading. The user assumes full responsibility when
            connecting external broker accounts or enabling auto-execution.
          </p>
        </section>

        {/* 7 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. User Compliance & Legal Use</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Users are solely responsible for ensuring compliance with local trading
            laws, taxation rules, and financial regulations before operating
            automated trading systems through RICHACLE.
          </p>
        </section>

        {/* 8 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Updates to Terms</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            RICHACLE may update these terms at any time. Continued use of the
            platform constitutes acceptance of all updated terms.
          </p>
        </section>
      </motion.div>
    </div>
  );
}
