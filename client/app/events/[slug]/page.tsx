import { Metadata } from "next";
import { notFound } from "next/navigation";
import DashboardUI from "../DashboardUI";

type Props = {
  params: Promise<{ slug: string }>;
};

const MARKET_DATABASE: Record<string, any> = {
  "morgan-stanley-launch-bitcoin": {
title:"Morgan Stanley Launch Bitcoin ETF",
  symbol: "BTC/USDT",
  side: "BUY",
  tp: "75000",
  sl: "65500",
  summary: "Morgan Stanley Bitcoin Trust (MSBT) is a spot Bitcoin ETF filed by Morgan Stanley in March 2026 with a ultra-low 0.14% fee, undercutting rivals like BlackRock's IBIT (0.25%), targeting their $8T AUM client base for potential $160B BTC inflows via 2% allocations—positioning it as a Wall Street gateway for regulated BTC exposure.",
  timeline: "15-24 April, 2026 to Target.",
    leverage: "3",
    odds: "78",
},
  "trump-bitcoin": {
  title: "Trump annouced pausing US/Israel strikes",
  symbol: "BTC/USDT",
  side: "BUY",
  tp: "78000",
  sl: "69500",
  summary: "Trump-Iran tensions de-escalate with a two-week ceasefire announced today, pausing US/Israel strikes if Iran reopens the Strait of Hormuz for oil flow; talks set for April 10 in Islamabad. Bitcoin has surged 5% to around $72,000 on this risk-on news, mirroring past patterns where de-escalation boosts crypto.", 
  timeline: "Next 48 hours from 8 April, 2026",
    leverage: "5",
    odds: "82",
}
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const market = MARKET_DATABASE[slug];

  return {
    twitter: {
      card: "summary_large_image",
      title: market?.title,
      description: market?.summary,
      images: [`https://richacle.com/events/${slug}.png`], 
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const market = MARKET_DATABASE[slug];

  if (!market) return notFound();

  return <DashboardUI data={market} />;
}