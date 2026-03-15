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
            RICHACLE — Research AI Agent for Daytrading — Last updated{" "}
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
            RICHACLE provides an AI-driven research environment to analyze markets 
            and generate daytrading insights. It may be used solely for legal research 
            and informational purposes. Attempts to reverse-engineer the AI agents, 
            exploit system functions, or manipulate markets may result in immediate 
            permanent account termination.
          </p>
        </section>

        {/* 3 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Market Risk & Disclaimer</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Financial markets involve significant risk. No profitability, outcome, 
            or specific trading result is guaranteed. AI-generated research and agent 
            insights are for informational purposes and do not eliminate risk. You 
            acknowledge that all trading decisions based on AI research are 
            executed at your own discretion and absolute responsibility.
          </p>
        </section>

        {/* 4 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Data Privacy</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            User information, research queries, and agent configurations are collected
            solely to operate and enhance the platform. We do not sell or distribute
            user data or proprietary research patterns. You are responsible for 
            maintaining the confidentiality of your credentials and any integrated 
            broker permissions.
          </p>
        </section>

        {/* 5 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Billing & Payments</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            All payments are final and non-refundable once access to the research 
            tools is granted. Subscription renewals occur automatically unless 
            cancelled in advance. No refunds are issued for trading losses, 
            AI hallucinations, system downtime, or the performance of decisions 
            made based on agent research.
          </p>
        </section>

        {/* 6 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Limitation of Liability</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            RICHACLE is not liable for losses, market movements, data delays,
            exchange downtime, or financial damages caused by the use of its 
            AI agents. The user assumes full responsibility for any real-world 
            application of the research provided by the platform.
          </p>
        </section>

        {/* 7 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. User Compliance & Legal Use</h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Users are solely responsible for ensuring compliance with local trading
            laws, taxation rules, and financial regulations before acting upon 
            AI-generated research or connecting RICHACLE to any live trading environment.
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